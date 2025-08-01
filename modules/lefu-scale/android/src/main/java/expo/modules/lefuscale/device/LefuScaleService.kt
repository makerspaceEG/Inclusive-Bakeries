package expo.modules.lefuscale.device

import android.content.Context
import android.util.Log
import com.peng.ppscale.PPBluetoothKit
import com.peng.ppscale.business.ble.listener.PPBleStateInterface
import com.peng.ppscale.business.ble.listener.PPSearchDeviceInfoInterface
import com.peng.ppscale.business.state.PPBleWorkState
import com.peng.ppscale.search.PPSearchManager
import com.lefu.ppbase.PPDeviceModel

/**
 * A service class to manage interactions with the Lefu Scale SDK.
 * This class follows a singleton pattern to ensure a single instance manages
 * all BLE operations like scanning, connecting, and data processing.
 */
class LefuScaleService {
    companion object {
        val instance: LefuScaleService by lazy { LefuScaleService() }
        private const val TAG = "LefuScaleService"
    }

    private var searchManager: PPSearchManager? = null
    var deviceImpl: AbstractDevice? = null
    val discoveredDevices = mutableListOf<PPDeviceModel>()

    // region CallbacksconnectedDevice

    /** Callback for when a new device is discovered during a scan. */
    var onDeviceDiscovered: ((PPDeviceModel) -> Unit)? = null

    /** Callback for changes in the overall BLE state (e.g., Bluetooth turned off). */
    var onBleStateChange: ((PPBleWorkState, PPDeviceModel?) -> Unit)? = null

    /** Callback for changes in the device connection state. */
    var onConnectionStateChange: ((String) -> Unit)? = null

    /** Callback for changes in the device data. */
    var onWeightDataChange: ((Map<String, Any>) -> Unit)? = null

    /** Callback for when an error occurs during the data measurement process. */
    var onConnectError: ((Map<String, Any>) -> Unit)? = null
    // endregion

    /**
     * Initializes the Lefu Scale SDK. This must be called before any other methods.
     * @param context The application context.
     * @param apiKey Your API key for the SDK.
     * @param apiSecret Your API secret for the SDK.
     */
    fun initializeSdk(context: Context, apiKey: String, apiSecret: String) {
        if (searchManager == null) {
            PPBluetoothKit.setDebug(true) // Enable debug logging
            PPBluetoothKit.initSdk(context, apiKey, apiSecret, "lefu.config")
            searchManager = PPSearchManager.getInstance()
            Log.d(TAG, "Lefu SDK Initialized")
        } else {
            Log.d(TAG, "Lefu SDK already initialized")
        }
    }

    /**
     * Starts scanning for nearby Lefu scales.
     * The caller is responsible for implementing the logic for discovered devices and state changes
     * via the provided callbacks. This includes managing any collection of discovered devices.
     * @param searchCallback The callback to handle discovered devices.
     * @param stateCallback The callback to handle BLE state changes during the scan.
     */
    fun startScan() {
        stopScan() // Cleans up any previous search loops
        Log.d(TAG, "Start device scan")
        if (searchManager == null) {
            val errorMsg = "SDK not initialized. Call initializeSdk first."
            val eventData = mapOf(
                "state" to "connectToDevice",
                "errorMessage" to errorMsg
            )
            Log.e(TAG, errorMsg)
            onConnectError?.invoke(eventData)
            return
        }

        discoveredDevices.clear() // Clears the list of discovered devices
        searchManager?.startSearchDeviceList(
            30000,
            PPSearchDeviceInfoInterface { device, _ ->
                Log.d(TAG, "Device Found: ${device.deviceName} - ${device.deviceMac} (${device.getDevicePeripheralType().name})")
                device?.let {
                    if (discoveredDevices.none { it.deviceMac == device.deviceMac }) {
                        discoveredDevices.add(device)
                        onDeviceDiscovered?.invoke(device)
                    }
                }
            },
            object : PPBleStateInterface() {
                override fun monitorBluetoothWorkState(
                    state: PPBleWorkState,
                    deviceModel: PPDeviceModel?
                ) {
                    onBleStateChange?.invoke(state, deviceModel)
                }
            }
        )
        Log.d(TAG, "Scan started")
    }

    /**
     * Stops the device scan.
     */
    fun stopScan() {
        searchManager?.stopSearch()
        Log.d(TAG, "Scan stopped")
    }

    /**
     * Connects to a specific scale.
     * Connection status is reported via the [onConnectionStateChange] callback.
     * @param device The [PPDeviceModel] of the device to connect to.
     */
    fun connectToDevice(deviceMac: String): Boolean {
        stopScan()
        Log.d(TAG, "Attempting to connect to $deviceMac")

        if (deviceMac.isNullOrEmpty()) {
            val errorMsg = "Invalid MAC address provided."
            val eventData = mapOf(
                "state" to "connectToDevice",
                "errorMessage" to errorMsg
            )
            Log.e(TAG, errorMsg)
            onConnectError?.invoke(eventData)
            return false
        }

        val device = discoveredDevices.find { it.deviceMac == deviceMac }

        if (device == null) {
            val errorMsg = "Device with MAC $deviceMac not found in discovered devices."
            val eventData = mapOf(
                "state" to "connectToDevice",
                "errorMessage" to errorMsg
            )
            Log.e(TAG, errorMsg)
            onConnectError?.invoke(eventData)
            return false
        }

        try {
            this.deviceImpl = DeviceControllerFactory.getInstance(device.getDevicePeripheralType())

            Log.d(TAG, "Gotten device impl: $deviceImpl ; Device type: ${device.getDevicePeripheralType()}")

            this.deviceImpl!!.setup(device)
            this.setupEventListeners()
            this.deviceImpl!!.connect(device)

            Log.d(TAG, "Connection process started for ${device.deviceMac}")

            return true
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Unsupported device type: ${device.getDevicePeripheralType()}", e)
            val eventData = mapOf(
                "state" to "connectToDevice",
                "errorMessage" to "Unsupported device type: ${device.getDevicePeripheralType()}"
            )
            onConnectError?.invoke(eventData)
            return false
        }
    }

    /**
     * Disconnects from the currently connected device.
     */
    suspend fun disconnect(): Boolean {
        try {
            Log.d(TAG, "Disconnecting from ${deviceImpl!!.lefuDevice?.deviceName ?: "unknown device"}")
            deviceImpl!!.disconnect()
            deviceImpl = null
            return true
        } catch (e: Exception) {
            Log.d(TAG, "Unable to disconnect from device", e)
            return false
        }
    }

    /**
     * Initialize the event listeners of the service
     */
    private fun setupEventListeners() {
        this.deviceImpl!!.onDataChange = { payload ->
            Log.d(TAG, "Weight data change detected: ${payload}")
            this.onWeightDataChange?.invoke(payload)
        }

        this.deviceImpl!!.onBroadcastReceived = { payload ->
            Log.d(TAG, "Broadcast received: ${payload}")
            this.onConnectionStateChange?.invoke(payload)
        }
    }

    suspend fun toZeroKitchenScale(): Boolean {
        return deviceImpl?.toZeroKitchenScale() ?: false
    }

    suspend fun changeKitchenScaleUnit(unit: String): Boolean {
        return deviceImpl?.changeKitchenScaleUnit(unit) ?: false
    }

    suspend fun sendSyncTime(): Boolean {
        return deviceImpl?.sendSyncTime() ?: false
    }

    suspend fun switchBuzzer(isOn: Boolean): Boolean {
        return deviceImpl?.switchBuzzer(isOn) ?: false
    }
}