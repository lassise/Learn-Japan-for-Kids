import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

// #98 — Kid-friendly error boundary
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-8 text-center">
                    <div className="mb-6 text-8xl">🙈</div>
                    <h1 className="mb-4 text-4xl font-extrabold text-brand-blue">Oops!</h1>
                    <p className="mb-8 max-w-md text-xl text-gray-600">
                        Something went a little sideways. Don't worry — your progress is safe!
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.href = '/';
                        }}
                        className="rounded-full bg-brand-blue px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105"
                    >
                        Back to Home 🏠
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
