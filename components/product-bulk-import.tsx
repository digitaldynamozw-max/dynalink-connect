'use client'

import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function ProductBulkImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showTemplate, setShowTemplate] = useState(false)

  const csvTemplate = `name,description,price,salePrice,stock,category
Laptop,High-performance laptop,999.99,,10,Electronics
Wireless Mouse,Comfortable wireless mouse,29.99,24.99,50,Electronics
USB-C Cable,Fast charging cable,14.99,,100,Electronics`

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        alert('CSV file must have headers and at least one product')
        return
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const products = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const product: any = {}

        headers.forEach((header, idx) => {
          const value = values[idx]
          if (header === 'price' || header === 'saleprice') {
            product[header] = value ? parseFloat(value) : null
          } else if (header === 'stock') {
            product[header] = value ? parseInt(value) : 0
          } else {
            product[header] = value || null
          }
        })

        if (product.name && product.price) {
          products.push(product)
        }
      }

      // Upload products
      const response = await fetch('/api/vendor/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
        credentials: 'include',
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Failed to import products:', error)
      setResult({
        success: 0,
        failed: 1,
        errors: ['Failed to process file'],
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function downloadTemplate() {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvTemplate))
    element.setAttribute('download', 'product_import_template.csv')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Import Products</h2>

      {/* Instructions */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Download the CSV template</li>
          <li>Fill in your product information</li>
          <li>Upload the CSV file to import all products at once</li>
        </ol>
      </div>

      {/* Template Section */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 mb-3">
          CSV columns: name, description, price, salePrice, stock, category
        </p>
        <button
          onClick={downloadTemplate}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
        >
          Download CSV Template
        </button>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importing}
            className="hidden"
          />

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Click to upload CSV</p>
            <p className="text-sm text-gray-600">or drag and drop</p>
          </div>
        </label>
      </div>

      {/* Import Progress */}
      {importing && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Importing products...</span>
        </div>
      )}

      {/* Results */}
      {result && !importing && (
        <div className={`rounded-lg p-6 ${result.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-start gap-3">
            {result.failed === 0 ? (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Import Complete</h4>
              <p className={result.failed === 0 ? 'text-green-800' : 'text-yellow-800'}>
                Successfully imported: {result.success} product{result.success !== 1 ? 's' : ''}
              </p>
              {result.failed > 0 && (
                <p className="text-yellow-800">
                  Failed: {result.failed} product{result.failed !== 1 ? 's' : ''}
                </p>
              )}

              {result.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-gray-900">Errors:</p>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {result.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setResult(null)}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Import more products
          </button>
        </div>
      )}
    </div>
  )
}
