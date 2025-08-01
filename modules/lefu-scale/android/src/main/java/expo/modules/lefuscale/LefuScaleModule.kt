package expo.modules.lefuscale

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.lefuscale.device.LefuScaleService
import kotlinx.coroutines.*
import android.util.Log

class LefuScaleModule : Module() {
  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  private var lefuService: LefuScaleService? = null

  override fun definition() = ModuleDefinition {
    Name("LefuScale")

    // Declare all events that can be sent to JavaScript.
    Events("onDeviceDiscovered", "onBleStateChange", "onWeightChange", "onConnectError")

    AsyncFunction("initializeSdk") { apiKey: String, apiSecret: String ->
      val context = requireNotNull(appContext.reactContext?.applicationContext) {
        "Application context is not available."
      }
      
      if (lefuService == null) {
        lefuService = LefuScaleService.instance
        setupLefuEventListeners()
      }
      lefuService?.initializeSdk(context, apiKey, apiSecret)
    }

    AsyncFunction("startScan") {
      lefuService?.startScan()
    }

    AsyncFunction("connectToDevice") { mac: String ->
      lefuService?.connectToDevice(mac)
    }

    AsyncFunction("disconnect") { promise: Promise ->
      CoroutineScope(Dispatchers.Default).launch {
        try {
          val success = lefuService?.disconnect() ?: false
          promise.resolve(success)
        } catch (e: Exception) {
          promise.reject("DISCONNECT_ERROR", "Failed to disconnect from scale", e)
        }
      }
    }

    AsyncFunction("stopScan") {
      lefuService?.stopScan()
    }

    AsyncFunction("toZeroKitchenScale") { promise: Promise ->
      CoroutineScope(Dispatchers.Default).launch {
        try {
          val success = lefuService?.toZeroKitchenScale() ?: false
          promise.resolve(success)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("changeKitchenScaleUnit") { unit: String, promise: Promise ->
      CoroutineScope(Dispatchers.Default).launch {
        try {
          val result = lefuService?.changeKitchenScaleUnit(unit) ?: false
          promise.resolve(result)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("sendSyncTime") { promise: Promise ->
      CoroutineScope(Dispatchers.Default).launch {
        try {
          val success = lefuService?.sendSyncTime() ?: false
          promise.resolve(success)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("switchBuzzer") { isOn: Boolean, promise: Promise ->
      CoroutineScope(Dispatchers.Default).launch {
        try {
          val result = lefuService?.switchBuzzer(isOn) ?: false
          promise.resolve(result)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }
    }

    OnDestroy {
      // Cancel all coroutines when the module is destroyed to prevent memory leaks.
      moduleScope.cancel()
    }
  }

  private fun setupLefuEventListeners() {
    lefuService?.onDeviceDiscovered = { device ->
      val deviceInfo = mapOf(
        "name" to device.deviceName,
        "id" to device.deviceMac,
        "rssi" to device.rssi,
        "deviceType" to device.getDevicePeripheralType().name
      )
      sendEvent("onDeviceDiscovered", deviceInfo)
    }

    lefuService?.onBleStateChange = { state, _ ->
      if (lefuService?.deviceImpl?.lefuDevice === null){
        sendEvent("onBleStateChange", mapOf("state" to state.name))
      }
    }

    lefuService?.onConnectError = { errorMessage ->
      sendEvent("onConnectError", errorMessage)
    }

    lefuService?.onConnectionStateChange = { state ->
      sendEvent("onBleStateChange", mapOf("state" to state))
    }

    lefuService?.onWeightDataChange = { payload ->
      sendEvent("onWeightChange", payload)
    }
  }
}
