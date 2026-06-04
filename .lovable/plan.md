Adicionar ao final do arquivo `.gitignore` (a partir da linha 25) o seguinte conteúdo:

```
# Local env files
.env
.env.*
!.env.example
```

Isso garante que arquivos de ambiente local não sejam versionados, mantendo apenas `.env.example` como referência.