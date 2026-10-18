const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidStyles, withDangerousMod, withAppBuildGradle } = require('expo/config-plugins');

const DARK = '#0E1214';
const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

module.exports = function withSplashStyleGuard(config) {
  config = withAndroidStyles(config, (config) => {
    const styleResources = config.modResults.resources;
    styleResources.style ??= [];
    const appTheme = styleResources.style.find((style) => style.$.name === 'AppTheme');
    if (!appTheme) throw new Error('AppTheme style not found while adding splash background guard');

    appTheme.item ??= [];
    appTheme.item = appTheme.item.filter((item) => item.$.name !== 'android:windowBackground');
    appTheme.item.push({
      $: { name: 'android:windowBackground' },
      _: '@color/splashscreen_background',
    });
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const marker = 'tasks.register("flattenSplashBitmaps")';
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `

// Flatten splash artwork over its exact brand background before Android packages resources.
def flattenSplashBitmaps = tasks.register("flattenSplashBitmaps") {
  doLast {
    def densities = ${JSON.stringify(DENSITIES)}
    def variants = [[qualifier: "", color: 0xFFF4EEDE], [qualifier: "-night", color: 0xFF0E1214]]
    variants.each { variant ->
      densities.each { density ->
        def imageFile = file("src/main/res/drawable\${variant.qualifier}-\${density}/splashscreen_logo.png")
        if (!imageFile.exists()) return
        def image = javax.imageio.ImageIO.read(imageFile)
        int[] pixels = image.getRGB(0, 0, image.width, image.height, null, 0, image.width)
        int background = variant.color as int
        int backgroundRed = (background >>> 16) & 0xff
        int backgroundGreen = (background >>> 8) & 0xff
        int backgroundBlue = background & 0xff
        for (int index = 0; index < pixels.length; index++) {
            int pixel = pixels[index]
            int alpha = (pixel >>> 24) & 0xff
            int inverseAlpha = 255 - alpha
            int red = Math.floorDiv(((((pixel >>> 16) & 0xff) * alpha) + (backgroundRed * inverseAlpha) + 127), 255)
            int green = Math.floorDiv(((((pixel >>> 8) & 0xff) * alpha) + (backgroundGreen * inverseAlpha) + 127), 255)
            int blue = Math.floorDiv((((pixel & 0xff) * alpha) + (backgroundBlue * inverseAlpha) + 127), 255)
            pixels[index] = 0xff000000 | (red << 16) | (green << 8) | blue
        }
        image.setRGB(0, 0, image.width, image.height, pixels, 0, image.width)
        javax.imageio.ImageIO.write(image, "png", imageFile)
      }
    }
  }
}
tasks.named("preBuild").configure { dependsOn(flattenSplashBitmaps) }
`;
    }
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      const lightDir = path.join(resDir, 'values-v31');
      const darkDir = path.join(resDir, 'values-night-v31');
      await fs.mkdir(lightDir, { recursive: true });
      await fs.mkdir(darkDir, { recursive: true });

      const lightStyles = `<resources>\n  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">\n    <item name="android:windowSplashScreenBackground">@color/splashscreen_background</item>\n    <item name="android:windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>\n    <item name="postSplashScreenTheme">@style/AppTheme</item>\n  </style>\n</resources>\n`;
      const darkStyles = `<resources>\n  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">\n    <item name="android:windowSplashScreenBackground">${DARK}</item>\n    <item name="android:windowSplashScreenIconBackgroundColor">${DARK}</item>\n    <item name="postSplashScreenTheme">@style/AppTheme</item>\n  </style>\n</resources>\n`;
      await fs.writeFile(path.join(lightDir, 'styles.xml'), lightStyles);
      await fs.writeFile(path.join(darkDir, 'styles.xml'), darkStyles);
      return config;
    },
  ]);
};
