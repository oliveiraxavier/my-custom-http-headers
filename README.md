# My Custom HTTP Headers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Uma extensão de navegador para gerenciar e injetar headers HTTP customizados em requisições web, com foco em segurança e organização através de projetos criptografados.

É 100% gratuita, de código aberto e não coleta dados do usuário.

## Visão Geral

Esta extensão permite que desenvolvedores e testadores modifiquem headers de requisições HTTP de forma fácil e segura. Organize seus headers em projetos separados e proteja informações sensíveis com criptografia baseada em senha, garantindo que seus dados permaneçam seguros e acessíveis apenas durante a sessão de uso.

## Funcionalidades

- **Gerenciamento de Headers**: Adicione, edite e remova headers HTTP customizados com facilidade.
- **Organização por Projetos**: Crie múltiplos projetos para agrupar diferentes conjuntos de headers, ideal para alternar entre contextos de trabalho.
- **Criptografia Segura**: Todos os projetos são armazenados localmente e protegidos com criptografia forte (AES-GCM). A senha nunca é armazenada, sendo solicitada apenas para desbloquear um projeto por sessão.
- **Importação e Exportação**: Exporte seus projetos para um arquivo JSON para backup ou compartilhamento e importe-os facilmente em outra instalação da extensão.
- **Tema Claro e Escuro**: Adapte a aparência da extensão ao seu gosto com um seletor de tema.
- **Privacidade em Primeiro Lugar**: Nenhuma informação é enviada para servidores externos. Todos os dados, incluindo projetos e headers, são armazenados localmente no seu navegador, tenha backup dos projetos que criar, caso seja complicado recriar tudo do zero.

## Permissões Necessárias

A extensão "My Custom HTTP Headers" solicita as seguintes permissões para funcionar corretamente:

- `storage`: Para salvar seus projetos e configurações de forma persistente e segura no armazenamento local do navegador.
- `webRequest` e `webRequestBlocking`: Para interceptar e modificar os headers das requisições HTTP conforme as regras do projeto ativo.
- `optional_host_permissions`: Permite que o usuário conceda permissão para domínios específicos em vez de todos os sites, aumentando a segurança e o controle.

## Como Construir a Partir do Código-Fonte

Se você deseja modificar ou construir a extensão a partir do código-fonte, siga os passos abaixo.

### Pré-requisitos

- Um navegador baseado em Firefox (WIP: Chromium + Google Chrome).

### Passos para Instalação Local

1 - Clone ou faça o download deste repositório:

```bash
git clone <https://github.com/seu-usuario/seu-repositorio.git>
```

2 - Abra seu navegador e navegue até a página de extensões:

- **Firefox**: `about:debugging#/runtime/this-firefox`
- **Chrome/Edge**: WIP

1. Ative o "Modo de Desenvolvedor" (geralmente um botão de alternância no canto superior direito).
2. Clique em "Carregar sem compactação" (ou "Load Temporary Add-on" no Firefox) e selecione a pasta referente ao browser que prentend utilizar, certifique-se de que na raiz do diretório selecionado, exista um `manifest.json`).
3. A extensão estará instalada e pronta para testes.

## Guia de uso

Veja no [**guia de utilização**](/docs/USAGE.md)

## Licença

Este projeto é licenciado sob a **Licença MIT**. Veja o arquivo `LICENSE` para mais detalhes.
