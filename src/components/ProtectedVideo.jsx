import { useEffect, useRef } from 'react'

const ProtectedVideo = ({ src, className = '', ...props }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Additional protection measures
    const handleDragStart = (e) => {
      e.preventDefault()
      return false
    }

    const handleSelectStart = (e) => {
      e.preventDefault()
      return false
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    // Prevent common video download attempts
    const handleKeyDown = (e) => {
      // Prevent Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        return false
      }
      
      // Prevent Ctrl+A (Select All)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        return false
      }
    }

    // Add event listeners
    video.addEventListener('dragstart', handleDragStart)
    video.addEventListener('selectstart', handleSelectStart)
    video.addEventListener('contextmenu', handleContextMenu)
    video.addEventListener('keydown', handleKeyDown)

    // Disable picture-in-picture programmatically
    if (video.disablePictureInPicture !== undefined) {
      video.disablePictureInPicture = true
    }

    // Cleanup
    return () => {
      video.removeEventListener('dragstart', handleDragStart)
      video.removeEventListener('selectstart', handleSelectStart)
      video.removeEventListener('contextmenu', handleContextMenu)
      video.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Monitor for developer tools
  useEffect(() => {
    let devtools = {
      open: false,
      orientation: null
    }

    const threshold = 160

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true
          // Pause video when dev tools are detected
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause()
          }
        }
      } else {
        devtools.open = false
      }
    }, 500)
  }, [])

  return (
    <div className="video-container video-protected no-save">
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noremoteplayback nofullscreen"
        disablePictureInPicture
        className={`w-full aspect-video ${className}`}
        onContextMenu={(e) => {
          e.preventDefault()
          return false
        }}
        onDragStart={(e) => {
          e.preventDefault()
          return false
        }}
        onSelectStart={(e) => {
          e.preventDefault()
          return false
        }}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitUserDrag: 'none',
          KhtmlUserDrag: 'none',
          MozUserDrag: 'none',
          OUserDrag: 'none',
          userDrag: 'none'
        }}
        {...props}
      >
        <source src={src} type="video/mp4" />
        <p>Your browser does not support the video tag. Please use a modern browser to view this content.</p>
      </video>
    </div>
  )
}

export default ProtectedVideo 