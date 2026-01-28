
Contexto do erro
- O erro que aparece ao clicar em “Criar Conta” (tela “Algo deu errado” com código ERR-…) está sendo disparado porque uma exceção está escapando e caindo no ErrorBoundary global.
- Ao testar no navegador, a requisição de cadastro falha com HTTP 422 e a resposta do backend de autenticação é:
  - code: "weak_password"
  - message: "Password is known to be weak and easy to guess..."
  - weak_password.reasons: ["pwned"]
- Ou seja: o backend está bloqueando senhas consideradas fracas/comprometidas (aparecem em listas públicas de vazamentos). Isso não tem relação com a migração de segurança nem com a remoção da tabela api_keys.

Objetivo
- Evitar que a tela “Algo deu errado” apareça no cadastro.
- Exibir uma mensagem amigável no próprio formulário de “Criar Conta” quando a senha for considerada fraca/comprometida.
- Melhorar a validação de senha no frontend para reduzir tentativas que certamente falharão no backend (sem depender de chaves/segredos no front).

Diagnóstico técnico (o que está acontecendo hoje)
1) Em src/pages/Auth.tsx, handleSignUp chama signUp(email, password) e mostra toast para alguns erros específicos.
2) Para o erro weak_password, hoje cai no else e tenta toast.error(error.message). Isso deveria funcionar, mas o usuário está vendo o ErrorBoundary.
3) A explicação mais provável para cair no ErrorBoundary é: em algum ponto do fluxo do signUp (ou em uma camada intermediária), o erro está sendo “lançado” (throw) ao invés de ser retornado como { error }, ou algum componente está quebrando ao renderizar após o estado mudar.
4) Mesmo assim, já temos uma evidência objetiva: a causa raiz do cadastro falhar é a política de senha fraca (weak_password). Então a correção deve:
   - tratar esse erro explicitamente
   - impedir que ele gere crash global
   - orientar o usuário a criar uma senha aceitável

Plano de implementação (frontend)
A) Tornar o tratamento de erro do cadastro “à prova de crash”
- Ajustar handleSignUp em src/pages/Auth.tsx para envolver o signUp em try/catch.
- Mesmo que algo inesperado ocorra (ex.: uma exceção), o catch converte em toast amigável e não deixa estourar para o ErrorBoundary.

B) Mensagens amigáveis para erros de cadastro comuns
- Em handleSignUp, mapear mensagens por tipo/código:
  - weak_password: “Senha muito fraca ou já comprometida. Use uma senha maior, com letras maiúsculas/minúsculas, número e símbolo.”
  - User already registered: já existe (já está implementado)
  - email_not_confirmed (se ocorrer em alguma variação): orientar sobre confirmação (sem quebrar)
  - Demais erros: mensagem genérica e curta (evitar expor detalhes técnicos).

C) Melhor validação de senha no frontend (para reduzir 422)
- Trocar o passwordSchema atual (min 6) por um schema mais forte, por exemplo:
  - mínimo 8 ou 10 caracteres
  - exigir pelo menos 1 letra e 1 número (opcional: símbolo)
- Observação: isso não garante que não haverá weak_password (porque “pwned” depende de listas externas), mas reduz falhas óbvias e melhora segurança.

D) UX: checklist de senha e dica na tela “Criar Conta”
- Adicionar um texto curto abaixo do input de senha no Tab “Criar Conta”:
  - “Dica: use 10+ caracteres com letras, números e um símbolo. Evite senhas comuns.”
- Opcional (bom): indicar força básica (fraca/média/forte) localmente, sem bibliotecas extras, só por heurística simples.

E) Evitar pequenos avisos do navegador (qualidade)
- Adicionar atributos autocomplete:
  - no login: email: "email", senha: "current-password"
  - no signup: email: "email", senha: "new-password"
- Isso não é segurança crítica, mas melhora UX e reduz warnings.

Plano de verificação (testes)
1) Testar cadastro com senha fraca (ex.: “senha123”):
   - Deve mostrar toast amigável e NÃO abrir ErrorBoundary.
2) Testar cadastro com senha forte (ex.: “X9!bR7pQ2@kL”):
   - Deve seguir para “Verifique seu Email” (fluxo atual).
3) Confirmar que o login continua funcionando com as mudanças de schema/UX.
4) Repetir o teste no preview e no publicado (quando publicar), garantindo que não há regressão.

Arquivos que serão alterados
- src/pages/Auth.tsx
  - try/catch no handleSignUp
  - tratamento específico para weak_password
  - atualização do passwordSchema e mensagens
  - autocomplete nos Inputs
- (Opcional, se existir lógica central) src/contexts/AuthContext.tsx
  - garantir que signUp nunca dá throw (sempre retorna { data, error }) — apenas se encontrarmos evidência de throw durante implementação.

Notas importantes (segurança/chaves)
- Não será adicionada nenhuma chave/secreto no frontend.
- O bloqueio weak_password é política do backend de autenticação e é desejável do ponto de vista de segurança; vamos apenas melhorar o tratamento/UX para o usuário.

Resultado esperado
- “Criar Conta” deixa de causar tela de erro geral.
- Usuário recebe feedback claro quando a senha é fraca/comprometida.
- A taxa de sucesso no cadastro aumenta com validação e orientações de senha.
