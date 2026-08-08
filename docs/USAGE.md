# Guia de uso da extensão My Custom HTTP Headers

Esta extensão ajuda a gerenciar headers HTTP personalizados por projeto, permitindo organizar regras de forma simples e segura.

## O que a extensão faz

- Cria e organiza projetos separados para diferentes contextos de trabalho.
- Permite testar seus sites com headers HTTP personalizados.
- Permite proteger projetos com senha e desbloqueá-los apenas durante a sessão atual.
- Exporta e importa projetos em formato json para backup ou compartilhamento.
- Aplica os headers ativos nas requisições do navegador conforme os domínios cadastrados.
- Oferece um tema claro e escuro para melhor conforto visual.

## Como usar

1. Crie um projeto no campo de projeto.
2. Adicione os headers desejados no formulário.
3. Defina os domínios que devem receber esses headers. Cada projeto deve ter seus domínios adicionados.
4. Se o projeto aparecer com um ícone 🔓, desbloqueie-o informando a senha.
5. A extensão começará a aplicar os headers automaticamente nas requisições correspondentes, desde que o domínio esteja na lista de domínios.

## Ícones da barra de ações

- 🗑 Remover projeto: exclui o projeto atualmente selecionado.
- 🌐 Filtro de domínios: abre a tela para cadastrar ou editar os domínios que receberão os headers.
- 💾 Exportar projeto: gera um arquivo JSON com os dados do projeto.
- 🗐 Importar projeto: importa um projeto salvo em arquivo JSON (copiar do arquivo exportado e colar).
- 🔓 Desbloquear projeto: abre a tela para informar a senha do projeto criptografado.
- 🌙 Alternar tema: muda entre tema claro e escuro.

## Estado do ícone da extensão

O ícone da extensão pode indicar que a configuração atual não está pronta para funcionar.

Quando a cor do ícone ficar vermelha, normalmente significa um destes cenários:

- O projeto está bloqueado.
- Nenhum projeto foi selecionado.
- O projeto selecionado não possui headers cadastrados.
- O projeto selecionado não possui domínios cadastrados.

Nesse caso, a extensão não estará aplicando os headers corretamente até que a situação seja corrigida.

## Observações importantes

- Os projetos criptografados são armazenados localmente.
- A extensão funciona com base no projetos desbloqueado da sessão atual.
- Para que os headers sejam aplicados, é necessário ter pelo menos um header e pelo menos um domínio cadastrado, observando sempre se o domínio a ser testado está na lista de domínios.

