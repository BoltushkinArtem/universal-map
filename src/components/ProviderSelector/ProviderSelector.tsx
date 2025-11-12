import React, { FC, ChangeEvent } from "react";
import { PROVIDERS } from "../../utils/providers";
import styles from "./ProviderSelector.module.scss";

interface ProviderSelectorProps {
  /** Выбранный идентификатор провайдера */
  value: string;
  /** Колбэк при изменении выбранного провайдера */
  onChange: (id: string) => void;
}

/**
 * ProviderSelector — выпадающий список для выбора провайдера картографической подложки.
 */
const ProviderSelector: FC<ProviderSelectorProps> = ({ value, onChange }) => {
  /**
   * Обработчик изменения значения select
   */
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.container}>
      {/* Заголовок селектора */}
      <label className={styles.label}>
        Подложка
      </label>

      {/* Селект для выбора провайдера */}
      <select className={styles.select} value={value} onChange={handleSelectChange}>
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
