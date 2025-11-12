# Universal Map

Universal Map — универсальное приложение для работы с различными картографическими сервисами. Позволяет:

- Использовать разные провайдеры карт (OpenStreetMap, Mapbox, ArcGIS, Google, Яндекс, OpenTransport).
- Добавлять маркеры и рисовать геометрические фигуры.
- Быстро переключаться между провайдерами.

---

## 🚀 Старт проекта

1. Клонируем репозиторий:

```bash
git clone https://github.com/BoltushkinArtem/universal-map.git
cd universal-map
```

2. Устанавливаем зависимости:

```bash
npm install
```

3. Создаем `.env.development` файл на основе `.env`:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_YANDEX_API_KEY=your_yandex_api_key_here
VITE_OPENTRANSPORT_KEY=your_thunderforest_key_here
```

4. Запускаем проект в режиме разработки:

```bash
npm run dev
```

---

## ⚙️ Скрипты

- `npm run dev` — запуск в режиме разработки
- `npm run build` — сборка проекта
- `npm run preview` — локальный просмотр сборки

---

## 🧰 Технологии

- [React 19](https://reactjs.org/)
- [Vite 7](https://vitejs.dev/)
- [TypeScript 5](https://www.typescriptlang.org/)
- [MapLibre GL](https://maplibre.org/)
- [Google Maps JS API](https://developers.google.com/maps/documentation/javascript)
- [Yandex Maps JS API](https://yandex.ru/dev/maps/jsapi/)
- [ArcGIS JS API](https://developers.arcgis.com/javascript/)

---

## 📁 Структура проекта

```
src/
  components/         # UI компоненты
  engines/            # Обёртки для различных движков карт
  assets/             # Изображения и иконки
  utils/              # Вспомогательные функции
  App.tsx             # Главный компонент
  main.tsx            # Точка входа
```

---

## ⚠️ Замечания

- Перед использованием убедитесь, что вы добавили ключи API в `.env.development`.
- Mapbox и OpenTransport требуют валидные токены.
- При публикации на GitHub **не включайте секретные ключи**.

