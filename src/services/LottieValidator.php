<?php

namespace vu\craftlottie\services;

use craft\base\Component;
use craft\helpers\Json;

/**
 * Service for validating Lottie animation files
 */
class LottieValidator extends Component
{
    /**
     * Detects the format of a Lottie file
     *
     * @param string $content File content
     * @param string|null $filename Optional filename for extension detection
     * @return string 'json' or 'lottie'
     */
    public function detectFormat(string $content, ?string $filename = null): string
    {
        // Check by extension first
        if ($filename) {
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if ($extension === 'lottie') {
                return 'lottie';
            }
            if ($extension === 'json') {
                return 'json';
            }
        }

        // Check by magic bytes/content
        // .lottie files are typically gzipped JSON
        // Check if content starts with gzip magic bytes (0x1f 0x8b)
        if (strlen($content) >= 2 && ord($content[0]) === 0x1f && ord($content[1]) === 0x8b) {
            return 'lottie';
        }

        // Check if it's valid JSON (starts with { or [)
        $trimmed = trim($content);
        if ($trimmed[0] === '{' || $trimmed[0] === '[') {
            return 'json';
        }

        // Default to json for backwards compatibility
        return 'json';
    }

    /**
     * Decompresses a .lottie file to JSON
     *
     * @param string $content Compressed .lottie content
     * @return string Decompressed JSON string
     * @throws \Exception If decompression fails
     */
    public function decompressLottie(string $content): string
    {
        // .lottie files are typically gzipped JSON
        $decompressed = @gzdecode($content);
        
        if ($decompressed === false) {
            // Try gzinflate as fallback (for deflate compression)
            $decompressed = @gzinflate($content);
        }
        
        if ($decompressed === false) {
            throw new \Exception('Failed to decompress .lottie file. The file may be corrupted or in an unsupported format.');
        }

        return $decompressed;
    }

    /**
     * Compresses a JSON string to .lottie format
     *
     * @param string $jsonString JSON string to compress
     * @return string Compressed .lottie content (gzipped)
     * @throws \Exception If compression fails
     */
    public function compressLottie(string $jsonString): string
    {
        // Compress JSON using gzip (same format as .lottie files)
        $compressed = @gzencode($jsonString, 9); // Level 9 = maximum compression
        
        if ($compressed === false) {
            throw new \Exception('Failed to compress JSON to .lottie format.');
        }

        return $compressed;
    }

    /**
     * Validates that a JSON string is a valid Lottie animation
     *
     * @param string|array $data JSON string or decoded array
     * @param string|null $filename Optional filename for format detection
     * @return array{valid: bool, error: string|null, data: array|null}
     */
    public function validateLottieFile($data, ?string $filename = null): array
    {
        // Handle empty data
        if (empty($data)) {
            return [
                'valid' => false,
                'error' => 'The file is empty.',
                'data' => null,
            ];
        }

        // Decode JSON if it's a string
        if (is_string($data)) {
            // Check if string is empty after trimming
            $trimmed = trim($data);
            if ($trimmed === '') {
                return [
                    'valid' => false,
                    'error' => 'The file is empty.',
                    'data' => null,
                ];
            }

            // Detect format and decompress if needed
            $format = $this->detectFormat($data, $filename);
            
            if ($format === 'lottie') {
                try {
                    $data = $this->decompressLottie($data);
                    // After decompression, data is now a JSON string
                    $trimmed = trim($data);
                } catch (\Exception $e) {
                    return [
                        'valid' => false,
                        'error' => 'Failed to decompress .lottie file: ' . $e->getMessage(),
                        'data' => null,
                    ];
                }
            }

            try {
                $decoded = Json::decode($trimmed, true);
            } catch (\Exception $e) {
                return [
                    'valid' => false,
                    'error' => 'Invalid JSON format: ' . $e->getMessage(),
                    'data' => null,
                ];
            }

            // Check for JSON parsing errors
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    'valid' => false,
                    'error' => 'Invalid JSON: ' . json_last_error_msg(),
                    'data' => null,
                ];
            }

            $data = $decoded;
        }

        // Must be an array/object
        if (!is_array($data)) {
            return [
                'valid' => false,
                'error' => 'Lottie file must be a JSON object.',
                'data' => null,
            ];
        }

        // Check for required Lottie properties (v, fr, w, h are essential)
        // ip and op are usually present but some files might not have them
        $requiredProperties = ['v', 'fr', 'w', 'h'];
        $missingProperties = [];

        foreach ($requiredProperties as $prop) {
            if (!isset($data[$prop])) {
                $missingProperties[] = $prop;
            }
        }

        if (!empty($missingProperties)) {
            return [
                'valid' => false,
                'error' => 'Missing required Lottie properties: ' . implode(', ', $missingProperties) . '. This does not appear to be a valid Lottie animation file.',
                'data' => null,
            ];
        }

        // Validate property types
        if (isset($data['v']) && !is_string($data['v']) && !is_numeric($data['v'])) {
            return [
                'valid' => false,
                'error' => 'Invalid Lottie version format.',
                'data' => null,
            ];
        }

        if (isset($data['fr']) && (!is_numeric($data['fr']) || $data['fr'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid frame rate. Frame rate must be a positive number.',
                'data' => null,
            ];
        }

        if (isset($data['w']) && (!is_numeric($data['w']) || $data['w'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid width. Width must be a positive number.',
                'data' => null,
            ];
        }

        if (isset($data['h']) && (!is_numeric($data['h']) || $data['h'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid height. Height must be a positive number.',
                'data' => null,
            ];
        }

        // Check for layers or assets
        // Note: Some valid Lottie files might have empty layers/assets arrays (templates, placeholders)
        // We'll be lenient and only validate structure, not content
        if (isset($data['layers']) && !is_array($data['layers'])) {
            return [
                'valid' => false,
                'error' => 'Layers must be an array.',
                'data' => null,
            ];
        }

        if (isset($data['assets']) && !is_array($data['assets'])) {
            return [
                'valid' => false,
                'error' => 'Assets must be an array.',
                'data' => null,
            ];
        }
        
        // We don't require layers or assets to exist or be non-empty
        // Empty arrays are valid - the file structure is what matters

        // Layers and assets validation already handled above

        // All validations passed
        return [
            'valid' => true,
            'error' => null,
            'data' => $data,
        ];
    }

    /**
     * Validates file size (optional check)
     *
     * @param int $sizeInBytes File size in bytes
     * @param int $maxSizeInMB Maximum size in MB (default: 10MB)
     * @return array{valid: bool, error: string|null}
     */
    public function validateFileSize(int $sizeInBytes, int $maxSizeInMB = 10): array
    {
        $maxSizeInBytes = $maxSizeInMB * 1024 * 1024;

        if ($sizeInBytes > $maxSizeInBytes) {
            return [
                'valid' => false,
                'error' => "File size exceeds the maximum allowed size of {$maxSizeInMB}MB.",
            ];
        }

        if ($sizeInBytes === 0) {
            return [
                'valid' => false,
                'error' => 'File is empty.',
            ];
        }

        return [
            'valid' => true,
            'error' => null,
        ];
    }
}
