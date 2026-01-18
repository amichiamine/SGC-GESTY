import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.stacgate.minegesty',
    appName: 'SGC-MineGesty',
    webDir: 'www',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        Filesystem: {
            directory: 'Documents'
        }
    },
    android: {
        allowMixedContent: true,
        backgroundColor: '#0f172a'
    }
};

export default config;
