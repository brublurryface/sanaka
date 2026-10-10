/** Coordenação da tela: eventos não devem duplicar regras ou enviar requisições reais. */
import { describe, expect, it } from 'vitest';
import { PadariaLab } from './padaria-lab';

describe('PadariaLab', () => {
  it('handles a complete order-query-payment-replay flow', () => {
    const page = new PadariaLab();
    page.createOrder();
    expect(page.pending()).toBe(true);
    page.createOrder();
    expect(page.history.length()).toBe(2);
    page.complete();
    expect(page.history.state().response!.status).toBe(201);
    page.queryOrder();
    page.complete();
    expect(page.history.state().response!.status).toBe(200);
    page.pay();
    page.complete();
    expect(page.history.state().payments).toHaveLength(1);
    expect(page.repeatable()).toBe(true);
    page.repeat();
    page.complete();
    expect(page.history.state().payments).toHaveLength(1);
    page.runChecks();
    expect(page.checks().every((check) => check.passed)).toBe(true);
  });
  it('demonstrates duplicate payments only when the key is disabled', () => {
    const page = new PadariaLab();
    page.createOrder();
    page.complete();
    page.idempotent.set(false);
    page.pay();
    page.complete();
    page.repeat();
    page.complete();
    expect(page.history.state().payments).toHaveLength(2);
    page.restart();
    expect(page.history.state().orders).toHaveLength(0);
    page.restart(true);
    expect(page.history.state().products[0].stock).toBe(0);
  });
  it('distinguishes local invalid input from explicit server validation', () => {
    const page = new PadariaLab();
    page.quantity.set(0);
    page.createOrder();
    expect(page.history.state().phase).toBe('localError');
    page.sendInvalidOrder();
    page.complete();
    expect(page.history.state().response!.status).toBe(400);
  });
  it('does not repeat GET or idle state and records deterministic failures', () => {
    const page = new PadariaLab();
    page.repeat();
    expect(page.history.length()).toBe(1);
    page.request({ method: 'GET', path: '/api/produtos' });
    page.repeat();
    expect(page.history.length()).toBe(2);
    page.complete();
    page.repeat();
    expect(page.repeatable()).toBe(false);
    page.failure.set('network');
    page.queryOrder();
    page.complete();
    expect(page.history.state().phase).toBe('networkError');
  });
});
