package expo.modules.lefuscale.device.impl

import java.util.concurrent.atomic.AtomicLong
import expo.modules.lefuscale.device.AbstractDevice
import expo.modules.lefuscale.device.utils.FoodScaleUtils
import expo.modules.lefuscale.device.utils.FoodScaleUnit
import com.lefu.ppbase.PPDeviceModel
import com.peng.ppscale.device.PeripheralFish.PPBlutoothPeripheralFishController
import com.peng.ppscale.business.ble.listener.FoodScaleDataChangeListener
import com.peng.ppscale.business.ble.listener.PPBleStateInterface
import com.peng.ppscale.business.state.PPBleWorkState
import com.peng.ppscale.vo.LFFoodScaleGeneral
import android.util.Log
import kotlinx.coroutines.*
import com.lefu.ppbase.vo.PPUnitType;
import com.peng.ppscale.business.ble.listener.PPBleSendResultCallBack;
import com.peng.ppscale.vo.PPScaleSendState;
import awaitScaleResultCallback

class FishDeviceImpl : AbstractDevice() {
    private val TAG = "LefuScaleService: FishDevice"
    private val timeout = 4_000L
    private var disconnectMonitorJob: Job? = null
    private var isActive = false

    private val FishController = PPBlutoothPeripheralFishController()

    private val dataChangeListener = object : FoodScaleDataChangeListener() {
        override fun processData(foodScaleGeneral: LFFoodScaleGeneral?, deviceModel: PPDeviceModel) {
            foodScaleGeneral?.let {
                FoodScaleUtils.handleScaleData(it, isStable = false) { payload ->
                    onDataChange!!.invoke(payload)
                }
                FishController.lastConnectTime = System.currentTimeMillis()
            }
        }

        override fun lockedData(foodScaleGeneral: LFFoodScaleGeneral?, deviceModel: PPDeviceModel) {
            foodScaleGeneral?.let {
                FoodScaleUtils.handleScaleData(it, isStable = true) { payload ->
                    onDataChange!!.invoke(payload)
                }
                FishController.lastConnectTime = System.currentTimeMillis()
            }
        }
    }

    override fun setup(device: PPDeviceModel) {
        this.lefuDevice = device
        FishController.registDataChangeListener(dataChangeListener)
    }

    /**
     * Attempts to connect to the device by starting a BLE scan.
     * Note: The actual connection is asynchronous. This method initiates the process.
     * @return `true` if the scan was started successfully, `false` otherwise.
     */
    override fun connect(device: PPDeviceModel): Boolean {
        Log.d(TAG, "Connecting to lefuscale ${device.deviceMac}")
    
        FishController.startConnect(
            device,
            object : PPBleStateInterface() {
                override fun monitorBluetoothWorkState(
                    state: PPBleWorkState?,
                    deviceModel: PPDeviceModel?
                ) {
                    when (state) {
                        PPBleWorkState.PPBleWorkStateConnected,
                        PPBleWorkState.PPBleWorkStateWritable -> {
                            onBroadcastReceived?.invoke("CustomPPBWorkSearchDeviceFound")
                            FishController.lastConnectTime = System.currentTimeMillis()
                            Log.d(TAG, "Successfully connected to LefuScale!")
                            // Only sets isActive to true if successfully connected and found
                            this@FishDeviceImpl.isActive = true
                            disconnectMonitorJob?.cancel()
                            disconnectMonitorJob = null
                        }

                        PPBleWorkState.PPBleWorkStateDisconnected,
                        PPBleWorkState.PPBleWorkStateConnectFailed -> {
                            onBroadcastReceived?.invoke("CustomPPBWorkSearchNotFound")
                            // Attempts to reconnect
                            Log.d(TAG, "Attemping to reconnect...")
                            autoReconnect()
                        }
    
                        else -> {
                            // Optional: handle other states or do nothing
                        }
                    }
    
                    Log.d(TAG, "BLE state changed: $state for ${deviceModel?.deviceName}")
                }
            }
        )

        return true
    }
    

    /** 
     * Function will execute on a background thread checking the 
     * last update from lefuScale after the defined timeout and if scale is connected
     */ 
    private fun autoReconnect() {
        this.disconnectMonitorJob?.cancel()
        this.disconnectMonitorJob = CoroutineScope(Dispatchers.Default).launch {
            while (this@FishDeviceImpl.isActive) {
                val elapsed = System.currentTimeMillis() - FishController.lastConnectTime
                if (elapsed > timeout && this@FishDeviceImpl.lefuDevice != null) {
                    connect(this@FishDeviceImpl.lefuDevice!!)
                }
                delay(1000)
            }
        }
    }
    

    override suspend fun toZeroKitchenScale(): Boolean {
        return awaitScaleResultCallback("Zeroing scale") { callback ->
            FishController.toZeroKitchenScale(callback) }
        }

    override suspend fun changeKitchenScaleUnit(unit: String): Boolean {
        val ppUnit = FoodScaleUnit.fromUserInput(unit).toPPUnitType()

        if (ppUnit == null) {
            throw IllegalArgumentException("Invalid unit: $unit")
        }

        Log.d(TAG, "Updating lefuscale unit to $unit, ppUnit: $ppUnit")

        return awaitScaleResultCallback("Change unit") { callback ->
            FishController.changeKitchenScaleUnit(ppUnit, callback) }
    }

    override suspend fun sendSyncTime(): Boolean {
        return awaitScaleResultCallback("Sync time") { callback ->
            FishController.sendSyncTime(callback) }
    }

    override suspend fun switchBuzzer(isOn: Boolean): Boolean {
        return awaitScaleResultCallback("Switching buzzer") { callback ->
            FishController.switchBuzzer(isOn, callback) }
    }

    override suspend fun disconnect() {
        FishController.stopSeach()
        FishController.disConnect()
        this.isActive = false
        disconnectMonitorJob?.cancel()
        disconnectMonitorJob = null
        this.lefuDevice = null
    }
}
