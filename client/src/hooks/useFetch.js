import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

/**
 * Generic data-fetching hook that wraps the shared Axios singleton.
 *
 * @param {string|null} endpoint - API path (e.g. '/jobcards'). Pass null to skip.
 * @param {object}      params   - Query parameters forwarded to the request.
 * @param {any[]}       deps     - Additional dependency array entries that re-trigger the fetch.
 *
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: () => void }}
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch('/jobcards', { status: 'Open' })
 */
const useFetch = (endpoint, params = {}, deps = []) => {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(!!endpoint)
  const [error,   setError]   = useState(null)

  // Keep latest params ref to avoid stale closures
  const paramsRef = useRef(params)
  paramsRef.current = params

  const fetchData = useCallback(async () => {
    if (!endpoint) return

    setLoading(true)
    setError(null)

    try {
      const response = await api.get(endpoint, { params: paramsRef.current })
      setData(response.data)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export default useFetch
