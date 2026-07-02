# Materiais da campanha de 1 ano

Este diretório preserva os arquivos-fonte da campanha e suas extrações completas para reutilização futura.

## Conteúdo

- `originals/estude-nutriwork.svg`: SVG original, incluindo todos os elementos vetoriais, filtros, máscaras, textos e imagens incorporadas.
- `originals/estude-nutriwork.pdf`: PDF original da campanha.
- `pdf-render/campaign-full.png`: renderização integral do PDF em 110 DPI.
- `pdf-render/page-1.png`: renderização integral do PDF em 150 DPI.
- `extracted/svg-embedded/`: as 45 ocorrências de imagens raster incorporadas no SVG, sem eliminar duplicatas.
- `extracted/pdf-embedded/`: as 24 ocorrências de imagens incorporadas no PDF, sem eliminar duplicatas.
- `extracted/*/manifest.csv`: nome, tamanho, hash e metadados de origem de cada imagem.
- `extracted/*/text-content.txt`: textos extraídos de cada arquivo-fonte.
- `extracted/svg-embedded/color-palette.txt`: cores hexadecimais declaradas no SVG.

As duplicatas foram mantidas intencionalmente porque o objetivo deste arquivo é preservar todas as ocorrências e não apenas os recursos únicos.

## Reproduzir a extração

```powershell
python scripts/extract_campaign_assets.py campaign-source/originals/estude-nutriwork.svg campaign-source/originals/estude-nutriwork.pdf campaign-source/extracted
```

O script requer `pypdf`. A renderização do PDF usa Poppler (`pdftoppm`).
