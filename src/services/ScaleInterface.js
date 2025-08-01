/**
 * Interface that defines the contract for any scale module
 * Any scale implementation must implement these methods
 */
export class ScaleInterface {
	/**
	 * Start scanning for scale devices
	 * @param {Function} onDeviceFound - Callback when a device is found
	 */
	startScan(onDeviceFound) {
		throw new Error('startScan must be implemented')
	}

	/**
	 * Stop scanning for devices
	 */
	stopScan() {
		throw new Error('stopScan must be implemented')
	}

	/**
	 * Connect to a specific device
	 * @param {{name: string, id: string}} device - The ID and Name of the device to connect to
	 * @param {Function} onWeightUpdate - Callback for weight updates
	 * @returns {Promise<Object>} The connected device object
	 */
	connect(device) {
		throw new Error('connect must be implemented')
	}

	/**
	 * Disconnect from a specific device
	 */
	disconnect() {
		throw new Error('disconnect must be implemented')
	}

	/**
	 * Read the current weight from the device
	 * @param {Object} device - The connected device object
	 * @returns {Promise<number>} The current weight reading
	 */
	readWeight(device) {
		throw new Error('readWeight must be implemented')
	}
}
