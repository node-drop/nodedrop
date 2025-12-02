
function TestComponent() {
  const isExpanded = true
  
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="header">
        Header Content
      </div>

      {isExpanded && (
        <div className="flex-1 flex flex-col">
          <div className="tabs">
            Tab Content
          </div>
          <div className="content">
            Content Area
          </div>
        </div>
      )}
    </div>
  )
}

export default TestComponent
