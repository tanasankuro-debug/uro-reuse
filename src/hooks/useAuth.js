import { useState, useEffect } from 'react'
import { authService } from '../services/supabase'
import { useApp } from '../store/useAppStore'

export function useAuth() {
  const { state, actions } = useApp()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load existing session
    authService.getSession().then(({ data: { session } }) => {
      if (session) actions.setUser(session.user, session)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthChange((_event, session) => {
      if (session) {
        actions.setUser(session.user, session)
      } else {
        actions.clearUser()
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  const signIn = async (email, password) => {
    const { data, error } = await authService.signIn(email, password)
    if (error) throw error
    return data
  }

  const signUp = async (email, password, metadata) => {
    const { data, error } = await authService.signUp(email, password, metadata)
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await authService.signOut()
    actions.clearUser()
  }

  return {
    user: state.user,
    session: state.session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
  }
}
