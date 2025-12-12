import React, { FC, ChangeEvent } from "react";
import { PROVIDERS } from "../../utils/providers";
import styles from "./ProviderSelector.module.scss";

/**
 * Пропсы компонента ProviderSelector
 */
interface ProviderSelectorProps {
  /** Выбранный идентификатор провайдера картографической подложки */
  value: string;

  /** Колбэк, вызываемый при изменении выбранного провайдера */
  onChange: (id: string) => void;
}

/**
 * ProviderSelector — выпадающий список для выбора провайдера картографической подложки.
 *
 * @param value - текущий выбранный провайдер
 * @param onChange - функция, вызываемая при смене провайдера
 */
const ProviderSelector: FC<ProviderSelectorProps> = ({ value, onChange }) => {
  /**
   * Обработчик изменения значения select
   *
   * @param event - событие изменения select
   */
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        Подложка
      </label>

      <select
        className={styles.select}
        value={value}
        onChange={handleSelectChange}
      >
        {PROVIDERS.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.title}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProviderSelector;
