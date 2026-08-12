'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  tabName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TabErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl border border-red-100 p-8 text-center shadow-xs space-y-4 my-4" dir="rtl">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">حدث خطأ أثناء تحميل تبويب {this.props.tabName || 'البيانات'}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              تعذر استعراض بعض الأجزاء بشكل صحيح. يمكنك المحاولة مجدداً دون تأثير على باقي النظام.
            </p>
            {this.state.error && (
              <p className="text-[11px] font-mono text-red-600 bg-red-50 p-2.5 rounded-xl mt-3 dir-ltr text-center font-bold">
                {this.state.error.toString()}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-black px-4 py-2.5 rounded-xl hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>إعادة تحميل التبويب</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
