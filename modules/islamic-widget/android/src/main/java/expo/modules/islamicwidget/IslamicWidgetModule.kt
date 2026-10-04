package expo.modules.islamicwidget

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.qashi.islamic.IslamicWidgetProvider

/**
 * Native bridge: JS writes the widget snapshot JSON to multi-process
 * SharedPreferences and asks the launcher to refresh all widget instances.
 */
class IslamicWidgetModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("IslamicWidget")

    Function("updateWidget") { bundleJson: String ->
      val context = appContext.reactContext ?: return@Function
      val prefs: SharedPreferences =
        context.getSharedPreferences(IslamicWidgetProvider.PREFS, Context.MODE_MULTI_PROCESS)
      prefs.edit().putString(IslamicWidgetProvider.KEY_BUNDLE, bundleJson).apply()
      // Trigger a broadcast so all widget instances re-render
      IslamicWidgetProvider.updateAll(context)
    }

    Function("getWidgetSnapshot") { ->
      val context = appContext.reactContext ?: return@Function ""
      val prefs = context.getSharedPreferences(IslamicWidgetProvider.PREFS, Context.MODE_MULTI_PROCESS)
      prefs.getString(IslamicWidgetProvider.KEY_BUNDLE, "") ?: ""
    }
  }
}
