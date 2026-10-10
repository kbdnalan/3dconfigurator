# Конфигуратор тумбы — 3D

Интерактивный 3D-конфигуратор тумбы на **React + Vite + Three.js**.
Размеры и материал меняются в панели — модель обновляется мгновенно.

## Возможности

- Модель из примитивов Three.js: корпус, верх, низ, боковины, задняя стенка, дверца, ручка.
- Размеры: ширина, высота, глубина (200–2000 мм) с валидацией.
- Материалы: белый `#F2F2F0`, серый `#888888`, орех `#805333` (процедурная текстура древесины).
- OrbitControls: вращение, масштаб, ограничения расстояния и угла.
- Мягкие тени, пол, нейтральный фон, размерные линии с подписями в мм.
- Адаптивная вёрстка для телефона.

## Запуск (Windows PowerShell)

```powershell
npm install      # установить зависимости
npm run dev      # режим разработки: http://localhost:5173
npm run lint     # проверка кода
npm run build    # production-сборка в папку dist
npm run preview  # просмотр сборки: http://localhost:4173
```

Требуется Node.js 18+.

## Структура

```
src/
  main.jsx                  точка входа React
  App.jsx                   состояние: размеры, материал
  config.js                 размеры по умолчанию, лимиты, цвета
  index.css                 стили и адаптивность
  utils/validation.js       проверка введённых размеров
  components/
    Viewer3D.jsx            мост React ↔ Three.js
    ControlPanel.jsx        панель параметров
    DimensionField.jsx      поле размера с проверкой ввода
    MaterialPicker.jsx      выбор материала
  three/
    SceneManager.js         renderer, камера, свет, рендер по запросу, очистка
    createCabinet.js        сборка тумбы из деталей
    createDimensions.js     размерные линии и подписи
    materials.js            материалы (создаются один раз)
    woodTexture.js          процедурная текстура ореха на canvas
```

## Публикация на Vercel

1. Загрузите проект в репозиторий GitHub.
2. На [vercel.com](https://vercel.com) → **Add New → Project** → выберите репозиторий.
3. Vercel сам определит Vite (настройки также в `vercel.json`): build `npm run build`, output `dist`.
4. Нажмите **Deploy**.
