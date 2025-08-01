package expo.modules.lefuscale.device

import com.lefu.ppbase.PPDeviceModel
import com.peng.ppscale.business.ble.listener.FoodScaleDataChangeListener
import com.peng.ppscale.business.ble.listener.PPBleStateInterface
import com.peng.ppscale.device.PPBlutoothPeripheralBaseController

/**
 * An abstract class for interacting with a generic device.
 */
abstract class AbstractDevice {
    var lefuDevice: PPDeviceModel? = null
    var controller: PPBlutoothPeripheralBaseController? = null
    var bleStateInterface: PPBleStateInterface? = null

    var onDataChange: ((Map<String, Any>) -> Unit)? = null
    var onBroadcastReceived: ((String) -> Unit)? = null

    /**
     * Initialize the device with the provided device model.     
     * Sets up the device controller and other necessary state before connecting.
     */
    abstract fun setup(device: PPDeviceModel)

    /**
     * Attempts to connect to the device.     
     * @return `true` if the connection was successful, `false` otherwise.
     */
    abstract fun connect(device: PPDeviceModel): Boolean

    /**
     * Disconnect and clean up the device.
     */
    abstract suspend fun disconnect()

    /**
     * Tare the scale to zero.   
     * @return `true` if the operation was successful, `false` otherwise.
     */
    abstract suspend fun toZeroKitchenScale(): Boolean

    /**
     * Change the scale unit type.
     * 
     * @param unit: The unit type to change to.  
     * @return `true` if the operation was successful, `false` otherwise.
     */
    abstract suspend fun changeKitchenScaleUnit(unit: String): Boolean

    /**
     * Send sync time to the scale.    
     * @return `true` if the operation was successful, `false` otherwise.
     */
    abstract suspend fun sendSyncTime(): Boolean

    /**
     * Switch the buzzer on or off.   
     *   
     * @param isOn: Whether to turn the buzzer on or off.     
     * @return `true` if the operation was successful, `false` otherwise.    
     */
    abstract suspend fun switchBuzzer(isOn: Boolean): Boolean
}