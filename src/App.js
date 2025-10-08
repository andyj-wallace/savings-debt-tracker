import DebtSavingsThermometer from './components/DebtSavingsThermometer';
import { TrackerProvider } from './context/TrackerProvider';

function App() {
  return (
    <TrackerProvider>
      <DebtSavingsThermometer />
    </TrackerProvider>
  );
}

export default App;