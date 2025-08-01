import android.util.Log
import com.peng.ppscale.business.ble.listener.PPBleSendResultCallBack
import com.peng.ppscale.vo.PPScaleSendState
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

suspend fun awaitScaleResultCallback(
    text: String,
    tag: String = "LefuScaleService",
    callWithCallback: (PPBleSendResultCallBack) -> Unit
): Boolean = suspendCancellableCoroutine { cont ->
    val callback = object : PPBleSendResultCallBack {
        override fun onResult(state: PPScaleSendState?) {
            when (state) {
                PPScaleSendState.PP_SEND_SUCCESS -> {
                    Log.d(tag, "$text success")
                    cont.resume(true)
                }
                PPScaleSendState.PP_SEND_FAIL -> {
                    Log.e(tag, "$text failed")
                    cont.resume(false)
                }
                PPScaleSendState.PP_DEVICE_NO_CONNECT -> {
                    Log.e(tag, "$text device not connected")
                    cont.resume(false)
                }
                PPScaleSendState.PP_DEVICE_ERROR -> {
                    Log.e(tag, "$text device error")
                    cont.resume(false)
                }
                else -> {
                    Log.e(tag, "$text unknown state")
                    cont.resume(false)
                }
            }
        }
    }

    callWithCallback(callback)
}