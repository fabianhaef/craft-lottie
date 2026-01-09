# craft-lottie

Lottie Animator for Craft cms

## Requirements

This plugin requires Craft CMS 5.8.0 or later, and PHP 8.2 or later.

## Installation

You can install this plugin from the Plugin Store or with Composer.

#### From the Plugin Store

Go to the Plugin Store in your project’s Control Panel and search for “craft-lottie”. Then press “Install”.

#### With Composer

Open your terminal and run the following commands:

```bash
# go to the project directory
cd /path/to/my-project.test

# tell Composer to load the plugin
composer require vu/craft-craft-lottie

# tell Craft to install the plugin
./craft plugin/install craft-lottie
```

## Configuration

### Enable .lottie File Uploads

By default, Craft CMS only allows certain file extensions to be uploaded. To enable `.lottie` file uploads, you need to add it to your `config/general.php` file:

```php
return GeneralConfig::create()
    // ... other configuration ...
    ->extraAllowedFileExtensions(['json', 'lottie'])
;
```

**Note**: The `.json` extension is typically already allowed by Craft CMS, but you may want to explicitly include it if you're customizing the allowed extensions list.

This configuration allows users to upload both `.json` and `.lottie` files through the Craft CMS control panel. The plugin will automatically detect and handle both formats.
