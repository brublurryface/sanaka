<?php
/**
 * Plugin Name: Óbolos de Sanaka
 * Plugin URI: https://github.com/brublurryface/sanaka/tree/main/wordpress
 * Description: Reúne ofertas, personagens e moedas de Sanaka, com recibos que preservam cada operação.
 * Version: 1.1.0
 * Requires PHP: 8.3
 * Author: Sanaka Bruna
 * Author URI: https://github.com/brublurryface
 * Update URI: https://github.com/brublurryface/sanaka/tree/main/wordpress
 * Text Domain: obolos-de-sanaka
 */
defined('ABSPATH') || exit;

define('SANAKA_OBOLO_VERSION', '1.1.0');
define('SANAKA_OBOLO_FILE', __FILE__);
require_once __DIR__ . '/includes/core.php';
require_once __DIR__ . '/includes/operations.php';
require_once __DIR__ . '/includes/admin-data.php';
require_once __DIR__ . '/includes/abilities.php';

add_action('init', 'sanaka_obolo_initialize', 5);
add_action('rest_api_init', 'sanaka_obolo_register_rest', 20);
add_filter('rest_allowed_cors_headers', 'sanaka_obolo_operations_cors', 10, 2);
add_action('wp_abilities_api_categories_init', 'sanaka_obolo_register_ability_category');
add_action('wp_abilities_api_init', 'sanaka_obolo_register_abilities');
if (function_exists('register_activation_hook')) {
    register_activation_hook(__FILE__, 'sanaka_obolo_initialize');
}
if (function_exists('is_admin') && is_admin()) {
    require_once __DIR__ . '/includes/admin.php';
}
