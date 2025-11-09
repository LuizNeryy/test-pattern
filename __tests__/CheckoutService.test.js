import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null', async () => {
            const carrinho = new CarrinhoBuilder()
                .comItens([new Item('Notebook', 3000)])
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false })
            };

            const repositoryDummy = {
                salvar: jest.fn()
            };

            const emailDummy = {
                enviarEmail: jest.fn()
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryDummy,
                emailDummy
            );

            const pedido = await checkoutService.processarPedido(carrinho, '1234-5678');

            expect(pedido).toBeNull();
            expect(repositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar desconto de 10% e enviar email de confirmação', async () => {
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comItens([
                    new Item('Mouse', 100),
                    new Item('Teclado', 100)
                ])
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const pedidoSalvo = new Pedido('PED-001', carrinho, 180, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const resultado = await checkoutService.processarPedido(carrinho, '1234-5678');

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, '1234-5678');
            expect(resultado).toBe(pedidoSalvo);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido PED-001 no valor de R$180'
            );
        });
    });

    describe('quando um cliente comum finaliza a compra', () => {
        it('deve processar sem desconto e enviar email', async () => {
            const usuarioPadrao = UserMother.umUsuarioPadrao();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPadrao)
                .comItens([new Item('Fone', 150)])
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const pedidoSalvo = new Pedido('PED-002', carrinho, 150, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const resultado = await checkoutService.processarPedido(carrinho, '9999-8888');

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(150, '9999-8888');
            expect(resultado).toBe(pedidoSalvo);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
        });
    });

    describe('quando o carrinho está vazio', () => {
        it('deve processar pedido com valor zero', async () => {
            const carrinho = new CarrinhoBuilder()
                .vazio()
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const pedidoSalvo = new Pedido('PED-003', carrinho, 0, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const resultado = await checkoutService.processarPedido(carrinho, '0000-0000');

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(0, '0000-0000');
            expect(resultado).toBe(pedidoSalvo);
        });
    });
});
