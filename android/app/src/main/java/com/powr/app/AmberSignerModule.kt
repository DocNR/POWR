package com.powr.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

/**
 * AmberSignerModule - React Native module that provides interfaces to communicate with Amber signer
 * Implements NIP-55 for Android: https://github.com/nostr-protocol/nips/blob/master/55.md
 */
class AmberSignerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
    private val TAG = "AmberSignerModule"
    private var pendingPromise: Promise? = null
    private val AMBER_PACKAGE_NAME = "com.greenart7c3.nostrsigner"
    private val NOSTRSIGNER_SCHEME = "nostrsigner:"

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "AmberSignerModule"
    }

    @ReactMethod
    fun isExternalSignerInstalled(promise: Promise) {
        val context = reactApplicationContext
        val intent = Intent().apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(NOSTRSIGNER_SCHEME)
        }
        val infos = context.packageManager.queryIntentActivities(intent, 0)
        Log.d(TAG, "External signer installed: ${infos.size > 0}")
        promise.resolve(infos.size > 0)
    }

    @ReactMethod
    fun requestPublicKey(permissions: ReadableArray?, promise: Promise) {
        Log.d(TAG, "requestPublicKey called with permissions: $permissions")
        
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(NOSTRSIGNER_SCHEME))
        intent.`package` = AMBER_PACKAGE_NAME
        intent.putExtra("type", "get_public_key")

        // Convert permissions to JSON if provided
        if (permissions != null) {
            intent.putExtra("permissions", convertPermissionsToJson(permissions))
        }

        try {
            pendingPromise = promise
            val activity = currentActivity
            if (activity != null) {
                Log.d(TAG, "Starting activity for result")
                activity.startActivityForResult(intent, REQUEST_CODE_SIGN)
            } else {
                Log.e(TAG, "Activity doesn't exist")
                promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist")
                pendingPromise = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching Amber activity: ${e.message}")
            promise.reject("E_LAUNCH_ERROR", "Error launching Amber: ${e.message}")
            pendingPromise = null
        }
    }

    @ReactMethod
    fun signEvent(eventJson: String, currentUserPubkey: String, eventId: String?, promise: Promise) {
        Log.d(TAG, "signEvent called - eventJson length: ${eventJson.length}, npub: $currentUserPubkey")
        
        // For NIP-55, we need to create a URI with the event JSON
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(NOSTRSIGNER_SCHEME))
        intent.`package` = AMBER_PACKAGE_NAME
        intent.putExtra("type", "sign_event")
        intent.putExtra("event", eventJson) // Event data as extra instead of URI
        
        // Add event ID for tracking (optional but useful)
        if (eventId != null) {
            intent.putExtra("id", eventId)
        }

        // Send the current logged in user npub
        intent.putExtra("current_user", currentUserPubkey)

        // Add flags to handle multiple signing requests
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

        try {
            pendingPromise = promise
            val activity = currentActivity
            if (activity != null) {
                Log.d(TAG, "Starting activity for result")
                activity.startActivityForResult(intent, REQUEST_CODE_SIGN)
            } else {
                Log.e(TAG, "Activity doesn't exist")
                promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist")
                pendingPromise = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching Amber activity: ${e.message}")
            promise.reject("E_LAUNCH_ERROR", "Error launching Amber: ${e.message}")
            pendingPromise = null
        }
    }

    // Convert ReadableArray of permissions to JSON string
    private fun convertPermissionsToJson(permissions: ReadableArray): String {
        val jsonArray = JSONArray()
        for (i in 0 until permissions.size()) {
            val permission = permissions.getMap(i)
            val jsonPermission = JSONObject()
            jsonPermission.put("type", permission.getString("type"))
            if (permission.hasKey("kind")) {
                jsonPermission.put("kind", permission.getInt("kind"))
            }
            jsonArray.put(jsonPermission)
        }
        return jsonArray.toString()
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        Log.d(TAG, "onActivityResult - requestCode: $requestCode, resultCode: $resultCode, data: $data")
        
        if (requestCode == REQUEST_CODE_SIGN) {
            val promise = pendingPromise
            pendingPromise = null

            if (promise == null) {
                Log.w(TAG, "No pending promise for activity result")
                return
            }

            if (resultCode != Activity.RESULT_OK) {
                Log.e(TAG, "Activity result not OK: $resultCode")
                promise.reject("E_CANCELLED", "User cancelled or activity failed")
                return
            }
            
            if (data == null) {
                Log.e(TAG, "No data returned from activity")
                promise.reject("E_NO_DATA", "No data returned from Amber")
                return
            }

            // Log all extras for debugging
            val extras = data.extras
            if (extras != null) {
                Log.d(TAG, "Intent extras:")
                for (key in extras.keySet()) {
                    Log.d(TAG, "  $key: ${extras.get(key)}")
                }
            }

            try {
                // First try to get data from extras
                val signature = data.getStringExtra("signature")
                val id = data.getStringExtra("id")
                val event = data.getStringExtra("event")
                val packageName = data.getStringExtra("package")
                
                val response = WritableNativeMap()

                if (signature != null) {
                    response.putString("signature", signature)
                }
                
                if (id != null) {
                    response.putString("id", id)
                }
                
                if (event != null) {
                    response.putString("event", event)
                }
                
                if (packageName != null) {
                    response.putString("packageName", packageName)
                }

                // If no extras, try to parse from URI
                val uri = data.data
                if (uri != null) {
                    // Check if we already have data from extras
                    if (signature == null) {
                        val uriSignature = uri.getQueryParameter("signature")
                        if (uriSignature != null) {
                            response.putString("signature", uriSignature)
                        }
                    }
                    
                    if (id == null) {
                        val uriId = uri.getQueryParameter("id")
                        if (uriId != null) {
                            response.putString("id", uriId)
                        }
                    }
                    
                    if (event == null) {
                        val uriEvent = uri.getQueryParameter("event")
                        if (uriEvent != null) {
                            response.putString("event", uriEvent)
                        }
                    }
                    
                    if (packageName == null) {
                        val uriPackage = uri.getQueryParameter("package")
                        if (uriPackage != null) {
                            response.putString("packageName", uriPackage)
                        }
                    }
                    
                    // Check if we received a JSON array of results
                    val uriSignature = uri.getQueryParameter("signature")
                    if (uriSignature?.startsWith("[") == true && uriSignature.endsWith("]")) {
                        try {
                            val resultsArray = JSONArray(uriSignature)
                            val results = WritableNativeArray()

                            for (i in 0 until resultsArray.length()) {
                                val resultObj = resultsArray.getJSONObject(i)
                                val resultMap = WritableNativeMap()

                                if (resultObj.has("signature")) {
                                    resultMap.putString("signature", resultObj.getString("signature"))
                                }

                                if (resultObj.has("id")) {
                                    resultMap.putString("id", resultObj.getString("id"))
                                }

                                if (resultObj.has("package")) {
                                    val pkg = resultObj.optString("package")
                                    if (pkg != "null") {
                                        resultMap.putString("packageName", pkg)
                                    }
                                }

                                results.pushMap(resultMap)
                            }

                            response.putArray("results", results)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to parse JSON array result: ${e.message}")
                            // Continue with normal handling if parsing fails
                        }
                    }
                }

                // Check if we got any data
                if (!response.hasKey("signature") && !response.hasKey("results")) {
                    Log.e(TAG, "No signature data in response")
                    promise.reject("E_NO_DATA", "No signature data returned from Amber")
                    return
                }

                // Log full response for debugging
                Log.d(TAG, "Amber response: $response")
                promise.resolve(response)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing Amber response: ${e.message}")
                promise.reject("E_PROCESSING_ERROR", "Error processing Amber response: ${e.message}")
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not used for our implementation
    }

    companion object {
        private const val REQUEST_CODE_SIGN = 9001
    }
}
