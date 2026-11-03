import styles from "./Slider.module.css";

export default function Slider({
  value,
  onValueChange,
  label = "Slider Component",
  min = 0,
  max = 100,
  step = 1,
  isActive = true,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  isActive?: boolean;
}) {
  const currentValue = value[0];
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleSliderChange = (newValue: number) => {
    onValueChange([newValue]);
  };

  return (
    <div className={`${styles.container} ${!isActive ? styles.inactive : ""}`}>
      <h2 className={styles.label}>{label}</h2>
      <div>
        <div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className={styles.slider}
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
            }}
          />
        </div>

        <div className={styles.minMaxGrid}>
          <span>{min}</span>
          <input
            className={styles.numberInput}
            type="number"
            value={currentValue}
            min={min}
            max={max}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              if (newValue >= min && newValue <= max) {
                handleSliderChange(newValue);
              }
            }}
          />
          <span className={styles.maxLabel}>{max}</span>
        </div>
      </div>
    </div>
  );
}