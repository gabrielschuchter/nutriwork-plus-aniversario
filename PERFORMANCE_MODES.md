# Modos adaptativos de performance

O site inicia em `full`. O modo ativo fica em `data-performance-mode` no elemento `<html>` e só pode ser rebaixado durante a sessão, evitando trocas visuais repetidas.

## Critérios iniciais

- `full`: padrão para todos os navegadores, inclusive quando os sinais de hardware não existem.
- `balanced`: somente com `hardwareConcurrency <= 2` combinado com `deviceMemory <= 2`, ou com economia de dados ativa.
- `reduced`: somente com `hardwareConcurrency <= 2` combinado com `deviceMemory <= 1`.

## Medição real

Cinco segundos após o carregamento, o site mede cinco janelas visíveis de dois segundos e observa long tasks de pelo menos 80 ms. Um pico isolado não altera o modo.

- `balanced`: pelo menos três janelas abaixo de 32 FPS e quatro long tasks; ou oito long tasks somando pelo menos 1,2 s.
- `reduced`: pelo menos quatro janelas abaixo de 20 FPS e seis long tasks; ou doze long tasks somando pelo menos 2,5 s.

A medição é descartada se a aba ficar oculta. O resultado não é persistido em `localStorage`.

## Efeitos por modo

- `full`: configuração visual original completa.
- `balanced`: canvases com DPR e frequência moderadamente menores; carrosséis e efeitos contínuos mais lentos; blur pesado levemente reduzido.
- `reduced`: gradiente WebGL estático; portal limitado a 8 FPS; carrosséis automáticos pausados; glows estáticos; efeitos contínuos decorativos e backdrop blur pesado desativados. Conteúdo, controles manuais, loaders e transições de navegação permanecem funcionais.

## Teste manual

Use o parâmetro antes do hash da rota:

- `/?performanceMode=full#/aniversario`
- `/?performanceMode=balanced#/aniversario`
- `/?performanceMode=reduced#/aniversario`

O override desativa a medição automática naquela carga. Confirme o modo no DevTools com:

```js
document.documentElement.dataset.performanceMode
```
