import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Button } from 'react-native-paper'

import ScaleServiceFactory from '../services/ScaleServiceFactory'

const ScaleConnectButton = ({ onConnect, onDisconnect }) => {
	const [isConnected, setIsConnected] = useState(false)
	const [error, setError] = useState(null)
	const [isConnecting, setIsConnecting] = useState(false)

	// Check connection status periodically
	useEffect(() => {
		const checkConnection = () => {
			const status = ScaleServiceFactory.getConnectionStatus()
			const wasConnected = isConnected
			setIsConnected(status.isConnected)

			// If connection state changed, update isConnectingRef
			if (wasConnected !== status.isConnected) {
				setIsConnecting(true)

				// Set a timeout to reset isConnectingRef after a short delay
				setTimeout(() => {
					setIsConnecting(false)
				}, 1000)
			}
		}

		// Check immediately
		checkConnection()

		// Check every 2 seconds
		const interval = setInterval(checkConnection, 2000)
		return () => clearInterval(interval)
	}, [isConnected])

	const handlePress = async () => {
		try {
			setIsConnecting(true)
			setError(null)
			if (isConnected) {
				await ScaleServiceFactory.disconnectFromScale()
				if (onDisconnect) onDisconnect()
			} else {
				await ScaleServiceFactory.connectToScale()
				if (onConnect) onConnect()
			}
		} catch (error) {
			setIsConnecting(false)
			setError(error.message)
		}
	}

	const getButtonContent = () => {
		if (isConnecting) {
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator color="#fff" style={styles.spinner} />
					<Text style={styles.loadingText}>
						{isConnected ? 'Disconnecting...' : 'Connecting...'}
					</Text>
				</View>
			)
		}
		return isConnected ? 'Disconnect Scale' : 'Connect to Scale'
	}

	return (
		<View style={styles.container}>
			{error && <Text style={styles.error}>{error}</Text>}
			<Button
				mode="contained"
				onPress={handlePress}
				disabled={isConnecting}
				buttonColor={isConnected ? '#f44336' : '#2196F3'}
				style={styles.button}
			>
				{getButtonContent()}
			</Button>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	button: {
		width: '100%',
	},
	error: {
		color: '#f44336',
		marginBottom: 8,
		textAlign: 'center',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	spinner: {
		marginRight: 8,
	},
	loadingText: {
		color: '#fff',
	},
})

export default ScaleConnectButton
