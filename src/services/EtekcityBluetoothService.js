import AsyncStorage from '@react-native-async-storage/async-storage'
import { requestPermissions } from '@utils/permissions/bluetooth'
import { Buffer } from 'buffer'
import { Platform } from 'react-native'
import { BleManager } from 'react-native-ble-plx'
import { ScaleInterface } from './ScaleInterface'

const ETEKCITY_SERVICE_UUID = 'FFF0'
const ETEKCITY_CHARACTERISTIC_UUID = 'FFF1'
const DEVICE_NAME = 'Etekcity Nutrition Scale'
const LAST_CONNECTED_DEVICE_ID_KEY = 'lastConnectedEtekcityScaleDeviceId'

class EtekcityScaleService extends ScaleInterface {
	constructor() {
		super()
		console.log('[EtekcityScale] Initializing service')
		this.manager = null
		if (Platform.OS === 'android') {
			this.manager = new BleManager()
			console.log('[EtekcityScale] Created BleManager for Android')
		}
		this.device = null
		this.weightCharacteristic = null
		this.connectionStatus = 'disconnected' // 'disconnected', 'connecting', 'connected'
	}

	async setActive(active) {
		if (active) {
			if (this.connectionStatus === 'disconnected') {
				this.connectionStatus = 'connecting'
				try {
					await requestPermissions()
					// The rest of the connection logic will be handled by the factory
				} catch (error) {
					this.connectionStatus = 'disconnected'
					console.error('Permission error:', error)
				}
			}
		} else {
			if (this.connectionStatus === 'connected' && this.device) {
				await this.disconnect()
			}
			this.connectionStatus = 'disconnected'
		}
	}

	// --- AsyncStorage Helpers ---
	async saveLastConnectedDeviceId(deviceId) {
		try {
			await AsyncStorage.setItem(LAST_CONNECTED_DEVICE_ID_KEY, deviceId)
			console.log(`[EtekcityScale] Saved last connected device ID: ${deviceId}`)
		} catch (error) {
			console.error(
				'[EtekcityScale] Error saving last connected device ID:',
				error
			)
		}
	}

	async retrieveLastConnectedDeviceId() {
		try {
			const deviceId = await AsyncStorage.getItem(LAST_CONNECTED_DEVICE_ID_KEY)
			console.log(
				`[EtekcityScale] Retrieved last connected device ID: ${deviceId}`
			)
			return deviceId
		} catch (error) {
			console.error(
				'[EtekcityScale] Error retrieving last connected device ID:',
				error
			)
			return null
		}
	}

	async clearLastConnectedDeviceId() {
		try {
			await AsyncStorage.removeItem(LAST_CONNECTED_DEVICE_ID_KEY)
			console.log('[EtekcityScale] Cleared last connected device ID')
		} catch (error) {
			console.error(
				'[EtekcityScale] Error clearing last connected device ID:',
				error
			)
		}
	}
	// --- End AsyncStorage Helpers ---

	async reconnectToLastDevice(onWeightUpdate) {
		console.log('[EtekcityScale] Attempting to reconnect to last device...')
		const lastDeviceId = await this.retrieveLastConnectedDeviceId()
		if (lastDeviceId) {
			try {
				console.log(
					`[EtekcityScale] Found last device ID: ${lastDeviceId}. Attempting direct connection.`
				)
				// Attempt to connect directly without scanning
				this.device = await this.manager.connectToDevice(lastDeviceId)
				console.log('[EtekcityScale] Reconnected to last device successfully.')

				// Discover services and characteristics and set up notifications
				await this.device.discoverAllServicesAndCharacteristics()
				const service = await this.device
					.services()
					.then((services) =>
						services.find((service) =>
							service.uuid.toLowerCase().includes('fff0')
						)
					)
				if (!service) {
					throw new Error(
						'[EtekcityScale] Required service FFF0 not found during reconnection.'
					)
				}
				this.weightCharacteristic = await service
					.characteristics()
					.then((characteristics) =>
						characteristics.find((char) =>
							char.uuid.toLowerCase().includes('fff1')
						)
					)
				if (!this.weightCharacteristic) {
					throw new Error(
						'[EtekcityScale] Required characteristic FFF1 not found during reconnection.'
					)
				}
				await this.setupWeightNotifications(onWeightUpdate)

				return true // Reconnection successful
			} catch (error) {
				console.warn(
					`[EtekcityScale] Failed to reconnect to ${lastDeviceId}. Error: ${error.message}. Please ensure the scale is on and within range.`,
					error
				)
				// Clear the stored ID if reconnection fails, so it doesn't keep trying a non-existent connection
				await this.clearLastConnectedDeviceId()
				this.device = null
				this.weightCharacteristic = null
				return false // Reconnection failed
			}
		}
		console.log('[EtekcityScale] No last connected device ID found.')
		return false // No device ID to reconnect to
	}

	async startScan(callback) {
		console.log('[EtekcityScale] Starting device scan')
		if (!this.manager) {
			console.error('[EtekcityScale] No BLE manager available')
			throw new Error('Bluetooth is not supported on this platform')
		}

		try {
			console.log('[EtekcityScale] Permissions granted, starting scan')

			// First, try to reconnect to the last known device
			const reconnected = await this.reconnectToLastDevice(callback) // Pass callback for weight updates
			if (reconnected) {
				console.log(
					'[EtekcityScale] Reconnected to previous device, skipping scan.'
				)
				// If reconnected, we should notify the app that a device is connected.
				// The `reconnectToLastDevice` already sets up notifications, so we just need to pass the device.
				// However, the `callback` in `startScan` expects a `device` object.
				// We can pass the currently connected device.
				if (this.device) {
					callback(this.device)
				}
				return
			}

			console.log(
				'[EtekcityScale] No previous device found or reconnection failed. Starting new scan.'
			)
			this.manager.startDeviceScan(
				null, // null means scan for all services
				{ allowDuplicates: false },
				(error, device) => {
					if (error) {
						console.error('[EtekcityScale] Scan error:', error)
						return
					}

					if (device.name) {
						console.log(
							`[EtekcityScale] Found device: ${device.name} (${device.id})`
						)
					}

					// Filter for Etekcity scale devices
					if (device.name && device.name.includes('Etekcity')) {
						console.log('[EtekcityScale] Found Etekcity device, stopping scan')
						this.manager.stopDeviceScan()
						callback(device)
					}
				}
			)
		} catch (error) {
			console.error('[EtekcityScale] Permission or scan error:', error)
			throw error
		}
	}

	stopScan() {
		console.log('[EtekcityScale] Stopping device scan')
		if (this.manager) {
			this.manager.stopDeviceScan()
		}
	}

	async connect(device, onWeightUpdate) {
		console.log(`[EtekcityScale] Attempting to connect to device: ${device.id}`)
		if (!this.manager) {
			console.error('[EtekcityScale] No BLE manager available')
			throw new Error('Bluetooth is not supported on this platform')
		}

		try {
			this.device = await this.manager.connectToDevice(device.id)
			console.log('[EtekcityScale] Connected to device')

			// Save the device ID upon successful connection
			await this.saveLastConnectedDeviceId(device.id)

			console.log('[EtekcityScale] Discovering services and characteristics')
			await this.device.discoverAllServicesAndCharacteristics()

			// Get the specific service using the UUID
			const service = await this.device
				.services()
				.then((services) =>
					services.find((service) =>
						service.uuid.toLowerCase().includes('fff0')
					)
				)

			if (!service) {
				throw new Error('[EtekcityScale] Required service FFF0 not found')
			}

			// Get the specific characteristic
			this.weightCharacteristic = await service
				.characteristics()
				.then((characteristics) =>
					characteristics.find((char) =>
						char.uuid.toLowerCase().includes('fff1')
					)
				)

			if (!this.weightCharacteristic) {
				throw new Error(
					'[EtekcityScale] Required characteristic FFF1 not found'
				)
			}

			await this.setupWeightNotifications(onWeightUpdate)
			return this.device
		} catch (error) {
			console.error('[EtekcityScale] Connection error:', error)
			throw error
		}
	}

	async setupWeightNotifications(onWeightUpdate) {
		console.log('[EtekcityScale] Setting up weight notifications')
		if (!this.weightCharacteristic) {
			console.error('[EtekcityScale] Weight characteristic not found')
			throw new Error('Weight characteristic not found')
		}

		await this.weightCharacteristic.monitor((error, characteristic) => {
			if (error) {
				console.error('[EtekcityScale] Notification error:', error)
				return
			}

			if (characteristic && characteristic.value) {
				// Convert the characteristic value to weight
				const weight = this.parseWeightData(characteristic.value)
				console.log(`[EtekcityScale] Received weight update: ${weight}`)
				onWeightUpdate(weight)
			}
		})
		console.log('[EtekcityScale] Weight notifications setup complete')
	}

	parseWeightData(value) {
		console.log('[EtekcityScale] Parsing weight data', value)
		const buffer = Buffer.from(value, 'base64')

		// Debug the buffer contents
		console.log('[EtekcityScale] Buffer length:', buffer.length)
		console.log(
			'[EtekcityScale] Buffer contents:',
			Array.from(buffer)
				.map((b) => '0x' + b.toString(16))
				.join(' ')
		)

		// Check if this is a tare command (buffer[2] === 0x64 seems to indicate tare)
		if (buffer.length === 11 && buffer[0] === 0xa5 && buffer[1] === 0x02) {
			console.log('[EtekcityScale] Tare button pressed')
			return {
				value: 0,
				isTare: true,
				isStable: false,
				unit: 'g', // default unit
			}
		}

		if (buffer.length === 16) {
			// Read weight from bytes 11-12 (indices 11 and 12)
			const rawValue = buffer.readUInt16LE(11)

			const scaleUnitHex = buffer[13]
			const scaleStableHex = buffer[15]

			let scaleUnit
			let scaleFactor

			switch (scaleUnitHex) {
				case 0x02:
					scaleUnit = 'g'
					scaleFactor = 10
					break
				case 0x00:
				case 0x01:
					scaleUnit = 'oz'
					scaleFactor = 100
					break
				case 0x03:
					scaleUnit = 'mL'
					scaleFactor = 10
					break
				case 0x04:
					scaleUnit = 'oz fl'
					scaleFactor = 100
					break
				default:
					scaleUnit = 'g'
					scaleFactor = 10
					break
			}

			const scaleValue = rawValue / scaleFactor
			console.log(`[EtekcityScale] Parsed weight: ${scaleValue}${scaleUnit}`)

			return {
				value: scaleValue,
				unit: scaleUnit,
				isStable: scaleStableHex === 0x01,
				isTare: false,
			}
		}

		console.error('[EtekcityScale] Invalid data format')
		return {
			value: 0,
			isTare: false,
			isStable: false,
			unit: 'g',
		}
	}

	async disconnect() {
		console.log('[EtekcityScale] Disconnecting from device')
		if (!this.manager) {
			return
		}

		try {
			if (this.device) {
				await this.device.cancelConnection()
				console.log('[EtekcityScale] Successfully disconnected')
				this.device = null
				this.weightCharacteristic = null
				await this.clearLastConnectedDeviceId() // Clear stored ID on explicit disconnect
			}
		} catch (error) {
			console.error('[EtekcityScale] Disconnect error:', error)
			throw error
		}
	}

	async readWeight(device) {
		if (!this.manager) {
			throw new Error('Bluetooth is not supported on this platform')
		}

		if (!this.device || this.device.id !== device.id) {
			throw new Error('Not connected to this device')
		}

		// For Etekcity scale, we don't need to actively read the weight
		// as it's provided through notifications
		return 0
	}
}

export default new EtekcityScaleService()
