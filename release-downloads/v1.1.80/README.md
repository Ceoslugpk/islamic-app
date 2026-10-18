# Islamic App v1.1.80 Android APK

The signed APK is stored as `app-release.apk.zst` because the APK exceeds GitHub's 100 MiB per-file Git limit.

- Package: `com.qashi.islamic`
- Version: `1.1.80` (Android version code `99`)
- Compressed size: 47,619,752 bytes
- SHA-256 of the uncompressed APK: `0a53fb9c6b22fa3f180736f0999ad58e68b090ed9c170a1a6cb396f444c05561`

Decompress with Zstandard to restore `app-release.apk`:

```sh
zstd -d app-release.apk.zst -o app-release.apk
```

Verify the resulting APK's SHA-256 against the value above before installing.
