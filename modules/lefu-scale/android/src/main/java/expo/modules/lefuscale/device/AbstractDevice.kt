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

    open fun setDevice(device: PPDeviceModel) {
        this.lefuDevice = device
    }

    /**
     * Attempts to connect to the device.
     * @return `true` if the connection was successful, `false` otherwise.
     */
    abstract fun connect(): Boolean

    /**
     * Adds a listener to receive bluetooth status of the device.
     */
    abstract fun addBleStatusListener(listener: PPBleStateInterface)

    /**
     * Adds a listener to receive data from the device.
     */
    abstract fun addDataListener(listener: FoodScaleDataChangeListener)

    /**
     * Gets the current status of the device.
     * @return `true` if the device is discoverable, `false` otherwise.
     */
    abstract fun getDeviceStatus(): Boolean

    abstract fun disconnect()
}