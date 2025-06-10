plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // If you use other plugins like 'kotlin-kapt', 'com.google.gms.google-services',
    // or 'com.google.dagger.hilt.android', make sure they are included here.
}

android {
    namespace = "com.habitualapp.habitual" // <<< This is the main fix
    compileSdk = 34 // Adjust to your project's compile SDK version

    defaultConfig {
        applicationId = "com.habitualapp.habitual" // Often the same as namespace
        minSdk = 24 // Adjust to your project's minimum SDK version
        targetSdk = 34 // Adjust to your project's target SDK version
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false // Set to true for production releases
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        // Add any build features your project uses, for example:
        // compose = true
        // viewBinding = true
    }
    packagingOptions {
        // Add any specific packaging options if needed
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Ensure these versions match your project or use the latest stable versions
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4") // If you use ConstraintLayout
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3") // For lifecycle-aware components

    // Firebase - uncomment and use the versions from your Firebase BoM
    // implementation(platform("com.google.firebase:firebase-bom:33.1.0")) // Replace with your BoM version
    // implementation("com.google.firebase:firebase-auth-ktx")
    // implementation("com.google.firebase:firebase-firestore-ktx")
    // implementation("com.google.firebase:firebase-analytics-ktx")


    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")

    // Add other dependencies your project uses
}
