import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Ошибка 3D-сцены:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="viewer">
          <div className="viewer-error" role="alert">
            Не удалось отобразить 3D-модель. Обновите страницу.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
