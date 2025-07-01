package expo.modules.lefuscale.device

import android.content.Context
import expo.modules.lefuscale.device.impl.HamburgerDeviceImpl
import com.lefu.ppbase.PPScaleDefine.PPDevicePeripheralType

/**
 * A factory for creating [AbstractDevice] instances.
 * This class provides a centralized way to get a controller for a specific device type.
 */
class DeviceControllerFactory {
    companion object {
        /**
         * Creates and returns an instance of a device controller based on the device type.
         *
         * @param deviceType The type of the device peripheral from the PPScale SDK.
         * @return An [AbstractDevice] implementation for the specified device type.
         * @throws IllegalArgumentException if the device type is not supported by this factory.
         */
        fun getInstance(deviceType: PPDevicePeripheralType): AbstractDevice {
            return when (deviceType) {
                PPDevicePeripheralType.PeripheralHamburger -> HamburgerDeviceImpl()
                // TODO: Add cases for other supported device types as they are implemented.
                else -> throw IllegalArgumentException("Unsupported device type: $deviceType")
            }
        }
    }
}