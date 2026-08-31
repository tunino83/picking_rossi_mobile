package com.rossi.projectmobile;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.Manifest;
import android.content.pm.PackageManager;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	private static final int REQUEST_CAMERA_PERMISSION = 1001;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Request CAMERA permission at runtime if not granted
		try {
			if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
				ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA_PERMISSION);
			}
		} catch (Exception e) {
			Log.w("MainActivity", "Error checking/requesting CAMERA permission", e);
		}

		try {
			// Access the Capacitor WebView and allow mixed content (HTTP) for development.
			// This makes the WebView accept HTTP resources when the app is served over HTTPS.
			WebView webView = (WebView) this.getBridge().getWebView();
			if (webView != null) {
				WebSettings settings = webView.getSettings();
				settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

				// Grant permission requests coming from the WebView (e.g., camera)
				webView.setWebChromeClient(new WebChromeClient() {
					@Override
					public void onPermissionRequest(final PermissionRequest request) {
						try {
							request.grant(request.getResources());
						} catch (Exception e) {
							e.printStackTrace();
						}
					}
				});

				try {
					// Ensure content is not drawn under the status bar
					getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
					getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

					// Calculate status bar height and add top padding to the WebView so header is clickable
					int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
					int statusBarHeight = 0;
					if (resourceId > 0) {
						statusBarHeight = getResources().getDimensionPixelSize(resourceId);
					}
					webView.setPadding(0, statusBarHeight, 0, 0);
					try {
						// Also inject a small JS snippet to set top padding on the HTML root
						final int topPx = statusBarHeight;
						webView.post(new Runnable() {
							@Override
							public void run() {
								try {
									webView.evaluateJavascript("(function(){document.documentElement.style.paddingTop='" + topPx + "px'; document.body.style.paddingTop='" + topPx + "px';})()", null);
								} catch (Exception e) {
									Log.w("MainActivity", "Could not inject padding JS", e);
								}
							}
						});
					} catch (Exception e) {
						Log.w("MainActivity", "Error injecting padding JS", e);
					}
				} catch (Exception e) {
					Log.w("MainActivity", "Error adjusting WebView padding for status bar", e);
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		if (requestCode == REQUEST_CAMERA_PERMISSION) {
			if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
				Toast.makeText(MainActivity.this, "Camera permission granted", Toast.LENGTH_SHORT).show();
			} else {
				Toast.makeText(MainActivity.this, "Camera permission denied. QR scanning may not work.", Toast.LENGTH_LONG).show();
			}
		}
	}

}
