import Constants from 'expo-constants'
import LefuScaleModule, {
	LefuScaleEvents,
} from '../modules/bluetooth/LefuScaleModule'
import { ScaleInterface } from './ScaleInterface'

class LefuScaleService extends ScaleInterface {
	constructor() {
		super()
		this.device = null
	}

	async startScan(onDeviceFound) {
		const { LEFU_API_KEY, LEFU_API_SECRET } = Constants.expoConfig?.extra ?? {}
		await LefuScaleModule.initializeScale(LEFU_API_KEY, LEFU_API_SECRET)
		LefuScaleModule.removeAllListener()

		LefuScaleModule.addDeviceDiscoveredListener((device) => {
			console.log('Device found:', device)
			if (onDeviceFound) {
				onDeviceFound(device).then(() => {
					if (device.name) {
						this.device.name = device.name
					}
				})
			}
		})

		return await new Promise((resolve, reject) => {
			LefuScaleModule.addBleStateChangeListener((state) => {
				console.log('BLE state changed:', state)

				const curState = state.state.toLowerCase()
				if (curState.includes('fail') || curState.includes('timeout')) {
					LefuScaleModule.removeListener([
						LefuScaleEvents.ON_DEVICE_DISCOVERED,
						LefuScaleEvents.ON_BLE_STATE_CHANGE,
					])
					reject(
						new Error('Bluetooth scanning was unsuccessful. Please try again.')
					)
				} else if (curState.includes('success')) {
					resolve()
				}
			})

			LefuScaleModule.startScan()
		})
	}

	async stopScan() {
		await LefuScaleModule.stopScan()
		LefuScaleModule.removeListener([
			LefuScaleEvents.ON_DEVICE_DISCOVERED,
			LefuScaleEvents.ON_BLE_STATE_CHANGE,
		])
	}

	async connect(deviceId, onWeightUpdate) {
		const { LEFU_DISCONNECT_TIMEOUT_MILLIS } = Constants.expoConfig?.extra ?? {}
		await LefuScaleModule.connectToDevice(
			deviceId,
			LEFU_DISCONNECT_TIMEOUT_MILLIS
		)
		// Store the device info
		this.device = {
			id: deviceId,
			name: 'Lefu Kitchen Scale', // Default fallback name
		}

		//   Set up weight listener
		LefuScaleModule.addWeightListener((data) => {
			console.log('Weight event:', data)
			if (onWeightUpdate) {
				onWeightUpdate({
					value: parseFloat(data.weight),
					unit: data.unit,
					isStable: data.isStable,
					isTare: data.isTare || false,
				})
			}
		})

		//reconnect scale if the connection has disconnected
		LefuScaleModule.addDisconnectListener(() => {
			console.warn('Device disconnected, attempting to reconnect...')
			this.connect(this.device.id, onWeightUpdate)
		})

		return this.device
	}

	async disconnect() {
		await LefuScaleModule.disconnect()
		LefuScaleModule.removeAllListener()
		this.device = null
	}

	async readWeight(device) {
		if (!this.device || this.device.id !== device.id) {
			throw new Error('Not connected to this device')
		}

		// For Lefu scale, we don't need to actively read the weight
		// as it's provided through notifications
		return 0
	}
}

export default new LefuScaleService()
