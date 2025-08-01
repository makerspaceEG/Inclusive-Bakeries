import { requestPermissions } from '@utils/permissions/bluetooth'
import Constants from 'expo-constants'
import { Alert } from 'react-native'
import LefuScaleModule, {
	LefuScaleEvents,
} from '../modules/bluetooth/LefuScaleModule'
import { ScaleInterface } from './ScaleInterface'

class LefuScaleService extends ScaleInterface {
	constructor() {
		super()
		this.device = null
		this.isAlertCurrentlyVisible = false
		this.isActive = false
	}

	async startScan(onDeviceFound) {
		const { LEFU_API_KEY, LEFU_API_SECRET } = Constants.expoConfig?.extra ?? {}
		await LefuScaleModule.initializeScale(LEFU_API_KEY, LEFU_API_SECRET)
		LefuScaleModule.removeAllListener()

		let resolveScanSuccess
		let rejectScanFailure

		const scanPromise = new Promise((resolve, reject) => {
			resolveScanSuccess = resolve
			rejectScanFailure = reject
		})

		LefuScaleModule.addDeviceDiscoveredListener((device) => {
			if (onDeviceFound) {
				onDeviceFound(device)
					.then(() => {
						resolveScanSuccess()
					})
					.catch((e) => {
						LefuScaleModule.removeAllListener()
						rejectScanFailure(new Error(e))
					})
			}
		})

		LefuScaleModule.addErrorListener((e) => {
			console.log('LefuScale Error received: ', e.errorMessage)
		})

		// Early BLE failure listeners
		LefuScaleModule.addBleStateChangeListener((event) => {
			switch (event.state) {
				case 'PPBleWorkSearchTimeOut':
				case 'PPBleWorkSearchFail':
				case 'PPBleWorkStateConnectFailed':
				case 'PPBleDiscoverServiceFail':
				case 'PPBleWorkStateAuthFailed':
					LefuScaleModule.removeAllListener()
					rejectScanFailure(
						new Error(`BLE connection failed with state: ${event.state}`)
					)
					break
			}
		})

		LefuScaleModule.startScan()
		return await scanPromise
	}

	async stopScan() {
		await LefuScaleModule.stopScan()
		LefuScaleModule.removeListener([LefuScaleEvents.ON_DEVICE_DISCOVERED])
	}

	async connect(device, onWeightUpdate) {
		const res = await LefuScaleModule.connectToDevice(device.id)

		if (!res) {
			throw new Error(
				`Unable to connect to ${
					device.name || 'unknown device (' + device.id + ')'
				}!`
			)
		}

		// Store the device info
		this.device = {
			id: device.id,
			name: device.name || 'Lefu Kitchen Scale', // Default fallback name
		}

		// Refresh all LefuModule listeners
		LefuScaleModule.removeAllListener()

		// Set up state change listener
		LefuScaleModule.addBleStateChangeListener((event) => {
			switch (event.state) {
				case 'CustomPPBWorkSearchDeviceFound':
					console.log('Device is found')
					// TODO: Clear the overlay component
					break
				case 'CustomPPBWorkSearchNotFound':
					console.log('Device is not found — triggering alert.')
					// TODO: Handle an overlay component to reconnect that will go away after x seconds.
					// this.handleNotFound()
					break
			}
		})

		// Set up weight listener
		LefuScaleModule.addWeightListener((data) => {
			if (onWeightUpdate) {
				onWeightUpdate({
					value: parseFloat(data.weight),
					unit: data.unit,
					isStable: data.isStable,
					isTare: data.isTare || false,
				})
			}
		})

		LefuScaleModule.addErrorListener((e) => {
			console.log('LefuScale Error received: ', e.errorMessage)
		})

		// Set isActive to true to prevent disconnection
		this.isActive = true

		return this.device
	}

	async disconnect() {
		const res = await LefuScaleModule.disconnect()
		if (res) {
			LefuScaleModule.removeAllListener()
			this.isActive = false
			this.device = null
			console.log('Successfully disconnected from scale')
		} else {
			console.error('Failed to disconnect from scale')
		}
		return res
	}

	async readWeight(device) {
		if (!this.device || this.device.id !== device.id) {
			throw new Error('Not connected to this device')
		}

		// For Lefu scale, we don't need to actively read the weight
		// as it's provided through notifications
		return 0
	}

	async setActive(isActive) {
		this.isActive = isActive
		if (isActive) {
			try {
				await requestPermissions()
				// After permissions are granted, you might want to initiate a scan or connection
			} catch (error) {
				console.error('Permission error in LefuScaleService:', error)
				// Handle permission denial
			}
		} else {
			// Optional: handle deactivation, e.g., by disconnecting
			if (this.device) {
				// TODO: SHOULD NOT DISCONNECT
				// await this.disconnect()
			}
		}
	}

	handleNotFound() {
		if (!this.isActive) {
			console.log('LefuScale service is not active. Skip alert.')
			return
		}

		if (this.isAlertCurrentlyVisible) {
			return
		}

		this.isAlertCurrentlyVisible = true

		Alert.alert(
			'Scale Not Connected',
			"Please turn on the scale and ensure it's nearby.",
			[
				{
					text: 'OK',
					onPress: () => {
						this.isAlertCurrentlyVisible = false
					},
				},
			],
			{
				cancelable: true,
				onDismiss: () => {
					this.isAlertCurrentlyVisible = false
				},
			}
		)
	}
}

export default new LefuScaleService()
