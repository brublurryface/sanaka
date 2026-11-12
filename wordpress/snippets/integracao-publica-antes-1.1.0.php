<?php

/**
 * Integração pública do WordPress com o Projeto Sanaka.
 *
 * No Code Snippets, copie o conteúdo abaixo sem a primeira linha `<?php`.
 */

if (! function_exists('sanaka_obolos_table_name')) {
    function sanaka_obolos_table_name(): string
    {
        global $wpdb;

        return $wpdb->prefix . 'sanaka_obolos';
    }
}

if (! function_exists('sanaka_obolos_install_table')) {
    function sanaka_obolos_install_table(): void
    {
        if (get_option('sanaka_obolos_db_version') === '1') {
            return;
        }

        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $table_name      = sanaka_obolos_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        dbDelta(
            "CREATE TABLE {$table_name} (
                character_slug varchar(100) NOT NULL,
                total bigint(20) unsigned NOT NULL DEFAULT 0,
                updated_at datetime NOT NULL,
                PRIMARY KEY  (character_slug)
            ) {$charset_collate};"
        );

        update_option('sanaka_obolos_db_version', '1', false);
    }
}

if (! function_exists('sanaka_obolos_character_exists')) {
    function sanaka_obolos_character_exists(string $character_slug): bool
    {
        $post_ids = get_posts([
            'post_type'              => 'post',
            'post_status'            => 'publish',
            'posts_per_page'         => 1,
            'fields'                 => 'ids',
            'meta_key'               => 'sanaka_character_slug',
            'meta_value'             => $character_slug,
            'no_found_rows'          => true,
            'ignore_sticky_posts'    => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        return $post_ids !== [];
    }
}

if (! function_exists('sanaka_obolos_read_total')) {
    function sanaka_obolos_read_total(string $character_slug): int
    {
        global $wpdb;

        $table_name = sanaka_obolos_table_name();
        $total      = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT total FROM {$table_name} WHERE character_slug = %s",
                $character_slug
            )
        );

        return $total === null ? 0 : (int) $total;
    }
}

if (! function_exists('sanaka_obolos_validate_character')) {
    function sanaka_obolos_validate_character(string $character_slug)
    {
        if (sanaka_obolos_character_exists($character_slug)) {
            return true;
        }

        return new WP_Error(
            'sanaka_character_not_found',
            'A personagem solicitada não possui um óbolo publicado.',
            ['status' => 404]
        );
    }
}

if (! function_exists('sanaka_obolos_get')) {
    function sanaka_obolos_get(WP_REST_Request $request)
    {
        $character_slug = sanitize_title((string) $request['character_slug']);
        $validation     = sanaka_obolos_validate_character($character_slug);

        if (is_wp_error($validation)) {
            return $validation;
        }

        return rest_ensure_response([
            'characterSlug' => $character_slug,
            'total'         => sanaka_obolos_read_total($character_slug),
        ]);
    }
}

if (! function_exists('sanaka_obolos_offer')) {
    function sanaka_obolos_offer(WP_REST_Request $request)
    {
        global $wpdb;

        $character_slug = sanitize_title((string) $request['character_slug']);
        $validation     = sanaka_obolos_validate_character($character_slug);

        if (is_wp_error($validation)) {
            return $validation;
        }

        $table_name = sanaka_obolos_table_name();
        $updated_at = current_time('mysql', true);
        $result     = $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO {$table_name} (character_slug, total, updated_at)
                 VALUES (%s, 1, %s)
                 ON DUPLICATE KEY UPDATE total = total + 1, updated_at = VALUES(updated_at)",
                $character_slug,
                $updated_at
            )
        );

        if ($result === false) {
            return new WP_Error(
                'sanaka_obolo_not_recorded',
                'Não foi possível registrar o óbolo.',
                ['status' => 500]
            );
        }

        return rest_ensure_response([
            'characterSlug' => $character_slug,
            'total'         => sanaka_obolos_read_total($character_slug),
        ]);
    }
}

add_action('init', 'sanaka_obolos_install_table');

add_action('rest_api_init', function (): void {
    $register_text_field = static function (
        string $field_name,
        string $description,
        ?string $format = null,
        ?callable $sanitize = null
    ): void {
        $schema = [
            'description' => $description,
            'type'        => 'string',
            'context'     => ['view'],
        ];

        if ($format !== null) {
            $schema['format'] = $format;
        }

        register_rest_field('post', $field_name, [
            'get_callback' => static function (array $post) use ($field_name, $sanitize): string {
                $value = (string) get_post_meta($post['id'], $field_name, true);

                return $sanitize === null ? $value : (string) $sanitize($value);
            },
            'schema' => $schema,
        ]);
    };

    $register_text_field(
        'hover_text',
        'Texto exibido no hover do post.',
        null,
        'sanitize_textarea_field'
    );
    $register_text_field(
        'sanakaverse_cover',
        'URL da composição quadrada usada como capa no Sanakaverse.',
        'uri',
        'esc_url_raw'
    );
    $register_text_field(
        'sanaka_character_slug',
        'Identificador estável da personagem no Projeto Sanaka.',
        null,
        'sanitize_title'
    );
    $register_text_field(
        'sanaka_character_name',
        'Nome editorial da personagem.',
        null,
        'sanitize_text_field'
    );
    $register_text_field(
        'sanaka_obolo_front',
        'URL do anverso do óbolo da personagem.',
        'uri',
        'esc_url_raw'
    );
    $register_text_field(
        'sanaka_obolo_back',
        'URL do reverso do óbolo da personagem.',
        'uri',
        'esc_url_raw'
    );

    $route_arguments = [
        'character_slug' => [
            'description'       => 'Identificador estável da personagem.',
            'required'          => true,
            'sanitize_callback' => 'sanitize_title',
            'validate_callback' => static function ($value): bool {
                return is_string($value)
                    && preg_match('/^[a-z0-9-]{1,100}$/', $value) === 1;
            },
        ],
    ];

    register_rest_route('sanaka/v1', '/obolos/(?P<character_slug>[a-z0-9-]+)', [
        [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => 'sanaka_obolos_get',
            'permission_callback' => '__return_true',
            'args'                => $route_arguments,
        ],
        [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => 'sanaka_obolos_offer',
            'permission_callback' => '__return_true',
            'args'                => $route_arguments,
        ],
    ]);
});
