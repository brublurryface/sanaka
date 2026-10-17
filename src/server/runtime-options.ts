/** Opções do processo Node, sem expor variáveis de ambiente ao navegador. */
export function readRuntimeOptions(environment: NodeJS.ProcessEnv = process.env) {
  const rawProxyHops = environment['TRUST_PROXY_HOPS']?.trim() || '0';
  const trustProxyHops = Number(rawProxyHops);

  // Nunca converter "true" em confiança irrestrita nos IPs enviados pelo visitante.
  if (!/^\d+$/u.test(rawProxyHops) || !Number.isSafeInteger(trustProxyHops)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative safe integer.');
  }

  const allowedHosts = new Set(
    (environment['NG_ALLOWED_HOSTS'] ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean),
  );
  const renderHostname = environment['RENDER_EXTERNAL_HOSTNAME']?.trim();

  // O Render fornece o hostname exato. Não liberar todos os subdomínios onrender.com.
  if (renderHostname) {
    allowedHosts.add(renderHostname);
  }

  return {
    allowedHosts: allowedHosts.size ? [...allowedHosts] : undefined,
    trustProxyHops,
    noIndex: environment['SITE_NOINDEX'] === 'true',
  };
}
