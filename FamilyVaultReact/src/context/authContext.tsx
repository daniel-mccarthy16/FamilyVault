import React, { FC, ReactNode, useContext, useState, useEffect, createContext } from 'react';

interface AuthState {
    accessToken: string | null;
    idToken: string | null;
    refreshToken: string | null;
}

interface GlobalState {
    authState: AuthState;
    theme: string;
}

interface GlobalContextType {
    state: GlobalState;
    setTokens: (tokens: AuthState) => void;
    clearTokens: () => void;
    setTheme: (theme: string) => void;
    isAuthenticated: () => boolean;
}

interface AuthProviderProps {
    children: ReactNode;
}

//TODO - redo use of noop functions in initializing initial global state
const defaultState: GlobalContextType = {
    state: {
        authState: {
            accessToken: null,
            idToken: null,
            refreshToken: null
        },
        theme: 'light',  // Default theme
    },
    setTokens: () => {},
    clearTokens: () => {},
    setTheme: () => {},
    isAuthenticated: ()  => false,
};

export const GlobalContext = createContext<GlobalContextType>(defaultState);

export const GlobalProvider: FC<AuthProviderProps> = ({ children }) => {

    const [state, setState] = useState<GlobalState>(defaultState.state);

    useEffect(() => {
        const storedTokens = {
            accessToken: localStorage.getItem('accessToken'),
            idToken: localStorage.getItem('idToken'),
            refreshToken: localStorage.getItem('refreshToken')
        };
        if (storedTokens.accessToken && storedTokens.idToken && storedTokens.refreshToken) {
            setState(prevState => ({
                ...prevState,
                authState: storedTokens
            }));
        }
    }, []);

    //TODO - review this
    const setTokens = (tokens: AuthState) => {
      if (tokens.accessToken !== null) {
          localStorage.setItem('accessToken', tokens.accessToken);
      } else {
          localStorage.removeItem('accessToken');
      }

      if (tokens.idToken !== null) {
          localStorage.setItem('idToken', tokens.idToken);
      } else {
          localStorage.removeItem('idToken');
      }

      if (tokens.refreshToken !== null) {
          localStorage.setItem('refreshToken', tokens.refreshToken);
      } else {
          localStorage.removeItem('refreshToken');
      }

      setState(prevState => ({
          ...prevState,
          authState: tokens
      }));
    };

    const clearTokens = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        setState(prevState => ({
            ...prevState,
            authState: { accessToken: null, idToken: null, refreshToken: null }
        }));
    };

    const setTheme = (theme: string) => {
        setState(prevState => ({
            ...prevState,
            theme
        }));
    };


    const isAuthenticated = (): boolean => {
        return state.authState.idToken !== null;
    }

    return (
        <GlobalContext.Provider value={{ state, setTokens, clearTokens, setTheme, isAuthenticated }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => useContext(GlobalContext);
