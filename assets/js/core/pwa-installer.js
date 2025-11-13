/**
 * PWA Installer - Handles Progressive Web App installation
 * Provides native-like install experience for users
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.installButton = null;
        
        this.init();
    }

    init() {
        // Check if already installed
        this.checkInstallStatus();
        
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] beforeinstallprompt event fired');
            
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            
            // Show install button
            this.showInstallButton();
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', (e) => {
            console.log('[PWA] App was installed');
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstalledMessage();
        });

        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('[PWA] Running as installed PWA');
            this.isInstalled = true;
        }

        // Register service worker
        this.registerServiceWorker();
    }

    checkInstallStatus() {
        // Check if app is already installed
        if ('getInstalledRelatedApps' in navigator) {
            navigator.getInstalledRelatedApps().then((relatedApps) => {
                if (relatedApps.length > 0) {
                    this.isInstalled = true;
                    console.log('[PWA] App is already installed');
                }
            });
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[PWA] Service Worker registered successfully:', registration);

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            this.showUpdateAvailable();
                        }
                    });
                });

            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    }

    createInstallButton() {
        // Create install button
        const button = document.createElement('button');
        button.id = 'pwa-install-button';
        button.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Install App
        `;
        button.className = 'flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium text-sm shadow-lg';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInUp 0.3s ease-out;
        `;

        // Add animation keyframes
        if (!document.getElementById('pwa-animations')) {
            const style = document.createElement('style');
            style.id = 'pwa-animations';
            style.textContent = `
                @keyframes slideInUp {
                    from {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutDown {
                    from {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Add click event
        button.addEventListener('click', () => this.installApp());

        return button;
    }

    showInstallButton() {
        if (this.isInstalled || this.installButton) return;

        this.installButton = this.createInstallButton();
        document.body.appendChild(this.installButton);
        
        console.log('[PWA] Install button shown');
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.animation = 'slideOutDown 0.3s ease-in';
            setTimeout(() => {
                if (this.installButton && this.installButton.parentNode) {
                    this.installButton.parentNode.removeChild(this.installButton);
                }
                this.installButton = null;
            }, 300);
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            console.log('[PWA] No deferred prompt available');
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log(`[PWA] User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
            this.hideInstallButton();
        } else {
            console.log('[PWA] User dismissed the install prompt');
        }

        // Clear the deferred prompt
        this.deferredPrompt = null;
    }

    showInstalledMessage() {
        const message = document.createElement('div');
        message.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                App berhasil diinstall!
            </div>
        `;
        message.className = 'fixed bottom-20 right-20 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-1000';
        message.style.animation = 'slideInUp 0.3s ease-out';
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOutDown 0.3s ease-in';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 3000);
    }

    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.innerHTML = `
            <div class="flex items-center justify-between">
                <span>Update tersedia!</span>
                <button id="update-app-btn" class="ml-4 px-3 py-1 bg-white text-indigo-600 rounded text-sm font-medium">
                    Update
                </button>
            </div>
        `;
        updateBanner.className = 'fixed top-0 left-0 right-0 bg-indigo-600 text-white px-4 py-3 z-1000';
        
        document.body.appendChild(updateBanner);
        
        document.getElementById('update-app-btn').addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Static method to initialize PWA installer
    static init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new PWAInstaller();
            });
        } else {
            new PWAInstaller();
        }
    }
}

// Auto-initialize when script loads
PWAInstaller.init();

// Export for manual initialization if needed
window.PWAInstaller = PWAInstaller;
