declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                initData?: string;
                ready?: () => void;
                expand?: () => void;
            };
        };
    }
}
export declare function App(): import("react/jsx-runtime").JSX.Element;
