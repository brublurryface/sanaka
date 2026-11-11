<?php
defined('ABSPATH') || exit;

/** Optional on WordPress versions with the Abilities API; never grants a capability. */
function sanaka_obolo_register_ability_category(): void
{
    if (function_exists('wp_register_ability_category')) {
        wp_register_ability_category('sanaka-obolos', [
            'label' => 'Óbolos de Sanaka',
            'description' => 'Consultas administrativas de ofertas, personagens e moedas.',
        ]);
    }
}

function sanaka_obolo_admin_permission(): bool
{
    return current_user_can('manage_options');
}

function sanaka_obolo_register_abilities(): void
{
    if (!function_exists('wp_register_ability')) {
        return;
    }
    $page = ['type' => 'integer', 'minimum' => 1, 'maximum' => 100000, 'default' => 1];
    $definitions = [
        'overview' => [
            'label' => 'Consultar visão geral dos óbolos',
            'properties' => [],
            'callback' => static fn($input) => sanaka_obolo_admin_overview(),
        ],
        'characters' => [
            'label' => 'Consultar personagens e moedas',
            'properties' => ['page' => $page, 'search' => ['type' => 'string', 'maxLength' => 200, 'default' => '']],
            'callback' => static fn($input) => sanaka_obolo_admin_characters((int) ($input['page'] ?? 1), (string) ($input['search'] ?? '')),
        ],
        'receipts' => [
            'label' => 'Consultar recibos de óbolos',
            'properties' => ['page' => $page, 'character' => ['type' => 'string', 'pattern' => '^([a-z0-9-]{1,100})?$', 'default' => '']],
            'callback' => static fn($input) => sanaka_obolo_admin_receipts((int) ($input['page'] ?? 1), (string) ($input['character'] ?? '')),
        ],
    ];
    foreach ($definitions as $name => $definition) {
        $schema = ['type' => 'object', 'additionalProperties' => false];
        if ($definition['properties'] !== []) {
            $schema['properties'] = $definition['properties'];
        }
        wp_register_ability('sanaka-obolos/' . $name, [
            'label' => $definition['label'],
            'description' => 'Consulta sem alterações, disponível somente para quem pode administrar o site.',
            'category' => 'sanaka-obolos',
            'input_schema' => $schema,
            'output_schema' => ['type' => 'object'],
            'execute_callback' => $definition['callback'],
            'permission_callback' => 'sanaka_obolo_admin_permission',
            'meta' => ['show_in_rest' => true, 'annotations' => ['readonly' => true, 'destructive' => false, 'idempotent' => true]],
        ]);
    }
}
