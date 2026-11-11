<?php
defined('ABSPATH') || exit;

add_action('admin_menu', 'sanaka_obolo_admin_menu');
add_action('admin_enqueue_scripts', 'sanaka_obolo_admin_assets');
add_filter('plugin_action_links_' . plugin_basename(SANAKA_OBOLO_FILE), 'sanaka_obolo_admin_action_links');

function sanaka_obolo_admin_url(string $tab = 'overview', array $args = []): string
{
    return add_query_arg(['page' => 'sanaka-obolos', 'tab' => $tab] + $args, admin_url('admin.php'));
}

function sanaka_obolo_admin_menu(): void
{
    $icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a7aaad" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m12 7 3 5-3 5-3-5Z"/></svg>';
    add_menu_page('Óbolos de Sanaka', 'Óbolos de Sanaka', 'manage_options', 'sanaka-obolos', 'sanaka_obolo_admin_render', 'data:image/svg+xml;base64,' . base64_encode($icon), 58);
}

function sanaka_obolo_admin_assets(string $hook): void
{
    if ($hook !== 'toplevel_page_sanaka-obolos') {
        return;
    }
    wp_enqueue_style('sanaka-obolos-admin', plugins_url('assets/admin.css', SANAKA_OBOLO_FILE), [], SANAKA_OBOLO_VERSION);
    wp_enqueue_script('sanaka-obolos-admin', plugins_url('assets/admin.js', SANAKA_OBOLO_FILE), [], SANAKA_OBOLO_VERSION, ['in_footer' => true, 'strategy' => 'defer']);
}

function sanaka_obolo_admin_action_links(array $links): array
{
    if (current_user_can('manage_options')) {
        array_unshift($links, '<a href="' . esc_url(sanaka_obolo_admin_url()) . '">Abrir painel</a>');
    }
    return $links;
}

function sanaka_obolo_admin_query(string $key): string
{
    return isset($_GET[$key]) && is_string($_GET[$key]) ? sanitize_text_field(wp_unslash($_GET[$key])) : '';
}

function sanaka_obolo_admin_history_note(): void
{
    echo '<p class="sanaka-obolos__note">Os totais preservam as ofertas anteriores. O histórico detalhado mostra somente operações concluídas com recibo desde sua ativação; ofertas antigas ou sem chave não criam recibos retroativos.</p>';
}

function sanaka_obolo_admin_error(WP_Error $error): void
{
    echo '<div class="sanaka-obolos__notice" role="alert"><strong>Consulta indisponível.</strong> ' . esc_html($error->get_error_message()) . ' Tente novamente mais tarde.</div>';
}

function sanaka_obolo_admin_pagination(array $data, string $tab, array $filters): void
{
    echo '<nav class="sanaka-obolos__pagination" aria-label="Paginação">';
    if ($data['page'] > 1) {
        echo '<a href="' . esc_url(sanaka_obolo_admin_url($tab, $filters + ['obolo_page' => $data['page'] - 1])) . '">← Anterior</a>';
    }
    echo '<span>Página ' . esc_html(number_format_i18n($data['page'])) . ' de ' . esc_html(number_format_i18n($data['pages'])) . ' · ' . esc_html(number_format_i18n($data['total'])) . ' resultados</span>';
    if ($data['page'] < $data['pages']) {
        echo '<a href="' . esc_url(sanaka_obolo_admin_url($tab, $filters + ['obolo_page' => $data['page'] + 1])) . '">Próxima →</a>';
    }
    echo '</nav>';
}

function sanaka_obolo_admin_filter(string $tab, string $field, string $label, string $value): void
{
    echo '<form class="sanaka-obolos__filter" method="get" action="' . esc_url(admin_url('admin.php')) . '">';
    echo '<input type="hidden" name="page" value="sanaka-obolos"><input type="hidden" name="tab" value="' . esc_attr($tab) . '">';
    echo '<label for="sanaka-obolos-filter">' . esc_html($label) . '</label>';
    echo '<div><input id="sanaka-obolos-filter" name="' . esc_attr($field) . '" type="search" maxlength="200" value="' . esc_attr($value) . '">';
    echo '<button type="submit">Consultar</button> <a href="' . esc_url(sanaka_obolo_admin_url($tab)) . '">Limpar filtro</a></div>';
    echo '<span class="sanaka-obolos__loading" role="status" aria-live="polite"></span></form>';
}

function sanaka_obolo_admin_overview_view(): void
{
    $data = sanaka_obolo_admin_overview();
    if (is_wp_error($data)) {
        sanaka_obolo_admin_error($data);
        return;
    }
    echo '<h2>Visão geral</h2><div class="sanaka-obolos__stats">';
    foreach (['offers' => 'Óbolos oferecidos', 'characters' => 'Personagens publicadas', 'receipts' => 'Recibos disponíveis'] as $key => $label) {
        echo '<div class="sanaka-obolos__stat"><span>' . esc_html($label) . '</span><strong>' . esc_html(number_format_i18n($data[$key])) . '</strong></div>';
    }
    echo '</div><section class="sanaka-obolos__capacity"><h3>Capacidade de operações</h3>';
    echo '<p>' . esc_html(number_format_i18n($data['allocated'])) . ' de ' . esc_html(number_format_i18n($data['capacity'])) . ' posições utilizadas.</p>';
    echo '<meter min="0" max="' . esc_attr((string) $data['capacity']) . '" value="' . esc_attr((string) min($data['allocated'], $data['capacity'])) . '" aria-label="Uso da capacidade de operações"></meter>';
    echo '<p>Recibos permanecem disponíveis para uma retentativa devolver a confirmação original. Atingir a capacidade bloqueia novas operações com chave; confirmações existentes continuam consultáveis.</p></section>';
    if ($data['capacityMismatch']) {
        echo '<p class="sanaka-obolos__notice" role="status">A contagem de posições difere dos recibos concluídos. Verifique a integridade das operações antes de alterar a capacidade.</p>';
    }
    sanaka_obolo_admin_history_note();
    echo '<p><a href="' . esc_url(sanaka_obolo_admin_url('offers')) . '">Explorar ofertas →</a> · <a href="' . esc_url(sanaka_obolo_admin_url('characters')) . '">Conhecer personagens e moedas →</a></p>';
}

function sanaka_obolo_admin_offers_view(int $page, string $character): void
{
    echo '<h2>Ofertas e recibos</h2><p>Encontre os totais de cada personagem em <a href="' . esc_url(sanaka_obolo_admin_url('characters')) . '">Personagens e moedas</a>, ou informe seu identificador abaixo.</p>';
    sanaka_obolo_admin_filter('offers', 'character', 'Identificador da personagem', $character);
    $data = sanaka_obolo_admin_receipts($page, $character);
    if (is_wp_error($data)) {
        sanaka_obolo_admin_error($data);
        return;
    }
    if ($character !== '') {
        echo '<p class="sanaka-obolos__total">Óbolos de ' . esc_html($character) . ': <strong>' . esc_html(number_format_i18n($data['currentTotal'])) . '</strong> · <a href="' . esc_url(sanaka_obolo_admin_url('characters', ['search' => $character])) . '">← Voltar à personagem e sua moeda</a></p>';
    }
    sanaka_obolo_admin_history_note();
    if ($data['items'] === []) {
        echo '<p class="sanaka-obolos__empty">Nenhum recibo encontrado para esta consulta.</p>';
    } else {
        echo '<div class="sanaka-obolos__table"><table><caption class="screen-reader-text">Recibos concluídos, do mais recente ao mais antigo</caption><thead><tr><th scope="col">Data</th><th scope="col">Personagem</th><th scope="col">Total confirmado</th><th scope="col">Recibo</th></tr></thead><tbody>';
        foreach ($data['items'] as $item) {
            $time = strtotime($item['createdAt'] . ' UTC');
            $date = $time === false ? $item['createdAt'] : wp_date(get_option('date_format') . ' ' . get_option('time_format'), $time);
            echo '<tr><td>' . esc_html($date) . '</td><td><a href="' . esc_url(sanaka_obolo_admin_url('offers', ['character' => $item['characterSlug']])) . '">' . esc_html($item['characterName']) . '</a></td><td>' . esc_html(number_format_i18n($item['confirmedTotal'])) . '</td><td><code title="' . esc_attr($item['receipt']) . '">' . esc_html(substr($item['receipt'], 0, 12)) . '…</code></td></tr>';
        }
        echo '</tbody></table></div>';
    }
    sanaka_obolo_admin_pagination($data, 'offers', $character !== '' ? ['character' => $character] : []);
}

function sanaka_obolo_admin_characters_view(int $page, string $search): void
{
    echo '<h2>Personagens e moedas</h2><p>As presenças vêm das publicações do CMS. Cada moeda mantém seu anverso, reverso e total de ofertas.</p>';
    sanaka_obolo_admin_filter('characters', 'search', 'Buscar por nome ou identificador', $search);
    $data = sanaka_obolo_admin_characters($page, $search);
    if (is_wp_error($data)) {
        sanaka_obolo_admin_error($data);
        return;
    }
    if ($data['items'] === []) {
        echo '<p class="sanaka-obolos__empty">Nenhuma personagem publicada encontrada para esta consulta.</p>';
    }
    echo '<div class="sanaka-obolos__characters">';
    foreach ($data['items'] as $item) {
        echo '<article class="sanaka-obolos__character"><h3>' . esc_html($item['name']) . '</h3><code>' . esc_html($item['slug']) . '</code><div class="sanaka-obolos__coins">';
        foreach (['front' => 'Anverso', 'back' => 'Reverso'] as $side => $label) {
            echo '<figure>';
            if ($item[$side] !== '') {
                echo '<img src="' . esc_url($item[$side]) . '" alt="' . esc_attr($label . ' do óbolo de ' . $item['name']) . '" width="144" height="144" loading="lazy" decoding="async">';
            } else {
                echo '<span class="sanaka-obolos__coin-empty">Imagem não cadastrada</span>';
            }
            echo '<figcaption>' . esc_html($label) . '</figcaption></figure>';
        }
        echo '</div><p>' . esc_html(number_format_i18n($item['total'])) . ' óbolos oferecidos</p><a href="' . esc_url(sanaka_obolo_admin_url('offers', ['character' => $item['slug']])) . '">Ver ofertas de ' . esc_html($item['name']) . ' →</a></article>';
    }
    echo '</div>';
    sanaka_obolo_admin_pagination($data, 'characters', $search !== '' ? ['search' => $search] : []);
}

function sanaka_obolo_admin_render(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('Você não tem permissão para consultar os óbolos.', '', ['response' => 403]);
    }
    $tabs = ['overview' => 'Visão geral', 'offers' => 'Ofertas', 'characters' => 'Personagens e moedas'];
    $requested = sanaka_obolo_admin_query('tab');
    $tab = isset($tabs[$requested]) ? $requested : 'overview';
    $rawPage = sanaka_obolo_admin_query('obolo_page');
    $page = ctype_digit($rawPage) ? max(1, min(100000, (int) $rawPage)) : 1;
    echo '<div class="wrap sanaka-obolos"><header class="sanaka-obolos__header"><span>SANAKA</span><h1>Óbolos de Sanaka</h1><p>Ofertas, presenças e as moedas que as encontram.</p><small>Versão ' . esc_html(SANAKA_OBOLO_VERSION) . ' · Por <a href="https://github.com/brublurryface" target="_blank" rel="noopener noreferrer">Sanaka Bruna</a> · Painel de consulta</small></header>';
    echo '<nav class="sanaka-obolos__tabs" aria-label="Áreas dos óbolos">';
    foreach ($tabs as $key => $label) {
        echo '<a href="' . esc_url(sanaka_obolo_admin_url($key)) . '"' . ($key === $tab ? ' aria-current="page"' : '') . '>' . esc_html($label) . '</a>';
    }
    echo '</nav><main class="sanaka-obolos__content">';
    if ($tab === 'offers') {
        sanaka_obolo_admin_offers_view($page, sanaka_obolo_admin_query('character'));
    } elseif ($tab === 'characters') {
        sanaka_obolo_admin_characters_view($page, sanaka_obolo_admin_query('search'));
    } else {
        sanaka_obolo_admin_overview_view();
    }
    echo '</main></div>';
}
