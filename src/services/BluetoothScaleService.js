import { Buffer } from 'buffer'
import { PermissionsAndroid, Platform } from 'react-native'
import { BleManager } from 'react-native-ble-plx'
import { ScaleInterface } from './ScaleInterface'

class BluetoothScaleService extends ScaleInterface {
	constructor() {
		super()
		this.isScanning = false
		this.connectedDevice = null
		this.manager = Platform.OS === 'android' ? new BleManager() : null
		this.devices = new Map()
	}

	async requestPermissions() {
		if (Platform.OS === 'android') {
			const apiLevel = parseInt(Platform.Version, 10)

			// For Android 12 and above, we need to request BLUETOOTH_SCAN and BLUETOOTH_CONNECT
			if (apiLevel >= 31) {
				const results = await Promise.all([
					PermissionsAndroid.request(
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
						{
							title: 'Bluetooth Scan Permission',
							message: 'App needs Bluetooth Scan permission',
							buttonNeutral: 'Ask Me Later',
							buttonNegative: 'Cancel',
							buttonPositive: 'OK',
						}
					),
					PermissionsAndroid.request(
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
						{
							title: 'Bluetooth Connect Permission',
							message: 'App needs Bluetooth Connect permission',
							buttonNeutral: 'Ask Me Later',
							buttonNegative: 'Cancel',
							buttonPositive: 'OK',
						}
					),
				])

				if (
					results.some(
						(result) => result !== PermissionsAndroid.RESULTS.GRANTED
					)
				) {
					throw new Error('Bluetooth permissions are required')
				}
			}

			// We still need location permission for all Android versions
			const locationPermission = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				{
					title: 'Location Permission',
					message: 'App needs location permission for Bluetooth scanning',
					buttonNeutral: 'Ask Me Later',
					buttonNegative: 'Cancel',
					buttonPositive: 'OK',
				}
			)

			if (locationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
				throw new Error(
					'Location permission is required for Bluetooth scanning'
				)
			}
		}
	}

	startScan(onDeviceFound) {
		if (this.isScanning) return

		this.isScanning = true
		this.manager.startDeviceScan(null, null, (error, device) => {
			if (error) {
				console.error('Scan error:', error)
				return
			}

			if (device && !this.devices.has(device.id)) {
				//console.log('Device :', device.name);
				this.devices.set(device.id, device)
				onDeviceFound(device)
			}
		})
	}

	stopScan() {
		this.isScanning = false
		this.manager.stopDeviceScan()
	}

	async connect(device, onWeightUpdate) {
		if (this.connectedDevice) {
			throw new Error('Already connected to a device')
		}

		try {
			// Add timeout promise
			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Connection timeout')), 5000)
			)

			// Connect with timeout
			const connectedDevice = await Promise.race([
				this.manager.connectToDevice(device.id, {
					timeout: 5000,
					autoConnect: true, // Try this if regular connect fails
				}),
				timeout,
			])

			// Wait for service discovery
			await connectedDevice.discoverAllServicesAndCharacteristics()

			// Check connection state
			const isConnected = await connectedDevice.isConnected()
			console.log('Connected:', isConnected)
			if (!isConnected) {
				throw new Error('Device disconnected after connection')
			}

			this.connectedDevice = connectedDevice
			return connectedDevice
		} catch (error) {
			console.error('Connection error:', error)
			// Clean up any existing connection
			await this.manager.cancelDeviceConnection(device.id).catch(() => null)
			throw error
		}
	}

	async disconnect() {
		if (!this.manager) {
			return
		}

		try {
			if (this.device) {
				await this.device.disconnect()
				this.device = null
				this.weightCharacteristic = null
			}
		} catch (error) {
			console.error('Disconnect error:', error)
			throw error
		}
	}

	async readWeight(device) {
		if (!this.connectedDevice || this.connectedDevice.id !== device.id) {
			throw new Error('Not connected to this device')
		}

		try {
			const characteristic =
				await this.connectedDevice.readCharacteristicForService(
					'00002a6e-0000-1000-8000-00805f9b34fb', // Assuming the service UUID is '00002a6e-0000-1000-8000-00805f9b34fb'
					'00002a6d-0000-1000-8000-00805f9b34fb' // Assuming the characteristic UUID is '00002a6d-0000-1000-8000-00805f9b34fb'
				)
			return this.parseWeightData(characteristic.value)
		} catch (error) {
			console.error('Reading weight error:', error)
			throw error
		}
	}

	// You'll need to customize this based on your scale's data format
	parseWeightData(value) {
		// Example implementation - modify according to your scale's protocol
		const buffer = Buffer.from(value, 'base64')
		const weight = buffer.readFloatLE(0)
		return weight
	}
}

export default new BluetoothScaleService()
