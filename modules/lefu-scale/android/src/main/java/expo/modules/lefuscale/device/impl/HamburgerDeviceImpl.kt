package expo.modules.lefuscale.device.impl

import java.util.concurrent.atomic.AtomicLong
import expo.modules.lefuscale.device.AbstractDevice
import expo.modules.lefuscale.device.utils.FoodScaleUtils
import com.lefu.ppbase.PPDeviceModel
import com.peng.ppscale.device.PeripheralHamburger.PPBlutoothPeripheralHamburgerController
import com.peng.ppscale.business.ble.listener.FoodScaleDataChangeListener
import com.peng.ppscale.business.ble.listener.PPBleStateInterface
import com.peng.ppscale.vo.LFFoodScaleGeneral
import android.util.Log
import kotlinx.coroutines.*

class HamburgerDeviceImpl : AbstractDevice() {
    private val TAG = "LefuScaleService: HamburgerDevice"
    private val timeout = 4_000L
    private var lastWeightReceivedTime = AtomicLong(0L)
    private var disconnectMonitorJob: Job? = null
    private var isActive = false
    private var isDisconnected = true

    private val hamburgerController = PPBlutoothPeripheralHamburgerController()

    private val dataChangeListener = object : FoodScaleDataChangeListener() {
        override fun processData(foodScaleGeneral: LFFoodScaleGeneral?, deviceModel: PPDeviceModel) {
            foodScaleGeneral?.let {
                lastWeightReceivedTime.set(System.currentTimeMillis())
                onBroadcastReceived!!.invoke("CustomPPBWorkSearchDeviceFound")
                isDisconnected = false
                FoodScaleUtils.handleScaleData(it, isStable = false) { payload ->
                    onDataChange!!.invoke(payload)
                }
            }
        }

        override fun lockedData(foodScaleGeneral: LFFoodScaleGeneral?, deviceModel: PPDeviceModel) {
            foodScaleGeneral?.let {
                lastWeightReceivedTime.set(System.currentTimeMillis())
                onBroadcastReceived!!.invoke("CustomPPBWorkSearchDeviceFound")
                isDisconnected = false
                FoodScaleUtils.handleScaleData(it, isStable = true) { payload ->
                    onDataChange!!.invoke(payload)
                }
            }
        }
    }

    /** 
     * Function will execute on a background thread checking the 
     * last update from lefuScale after the defined timeout and if scale is connected
     */ 
    private fun autoReconnect() {
        this.disconnectMonitorJob?.cancel()
        this.disconnectMonitorJob = CoroutineScope(Dispatchers.Default).launch {
            while (this@HamburgerDeviceImpl.isActive) {
                val elapsed = System.currentTimeMillis() - lastWeightReceivedTime.get()
                if (elapsed > timeout) {
                    Log.d(TAG, "Doing routine check after $elapsed ms.")
                    if (this@HamburgerDeviceImpl.lefuDevice != null) {
                        connect(this@HamburgerDeviceImpl.lefuDevice!!)
                    } 
                    if (isDisconnected){
                        onBroadcastReceived!!.invoke("CustomPPBWorkSearchNotFound")
                    }
                    isDisconnected = true
                }
                delay(1000)
            }
        }
    }

    override fun setup(device: PPDeviceModel) {
        this.lefuDevice = device
        hamburgerController.registDataChangeListener(dataChangeListener)
    }

    /**
     * Attempts to connect to the device by starting a BLE scan.
     * Note: The actual connection is asynchronous. This method initiates the process.
     * @return `true` if the scan was started successfully, `false` otherwise.
     */
    override fun connect(device: PPDeviceModel): Boolean {
        Log.d(TAG, "Connecting to lefuscale ${device.deviceMac}")
        hamburgerController.startSearch(device.deviceMac, null)
        if (disconnectMonitorJob == null) { 
            // Assumes that is it connected as there is no stable connected state for hamburger
            this@HamburgerDeviceImpl.isActive = true
            autoReconnect() 
        }

        return true
    }

    override suspend fun toZeroKitchenScale(): Boolean {
        throw IllegalArgumentException("Unsupported device type: ${this.lefuDevice?.deviceName}")
    }

    override suspend fun changeKitchenScaleUnit(unit: String): Boolean {
        throw IllegalArgumentException("Unsupported device type: ${this.lefuDevice?.deviceName}")
    }

    override suspend fun sendSyncTime(): Boolean {
        throw IllegalArgumentException("Unsupported device type: ${this.lefuDevice?.deviceName}")
    }

    override suspend fun switchBuzzer(isOn: Boolean): Boolean {
        throw IllegalArgumentException("Unsupported device type: ${this.lefuDevice?.deviceName}")
    }

    override suspend fun disconnect() {
        hamburgerController.stopSeach()
        hamburgerController.registDataChangeListener(null)
        hamburgerController.disConnect()
        this.isActive = false
        disconnectMonitorJob?.cancel()
        disconnectMonitorJob = null
        lastWeightReceivedTime = AtomicLong(0L)
        this.lefuDevice = null
    }
}
