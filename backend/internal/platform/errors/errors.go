package errors

import "fmt"

// Kind represents the category of error.
type Kind int

const (
	KindNotFound     Kind = iota
	KindConflict
	KindValidation
	KindForbidden
	KindUnauthorized
)

// Error is a domain error with a Kind and Message.
type Error struct {
	Kind    Kind
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

// NotFound constructs a not-found error for a given entity and id.
func NotFound(entity, id string) *Error {
	return &Error{
		Kind:    KindNotFound,
		Message: fmt.Sprintf("%s not found: %s", entity, id),
	}
}

// Conflict constructs a conflict error with the given message.
func Conflict(msg string) *Error {
	return &Error{
		Kind:    KindConflict,
		Message: fmt.Sprintf("conflict: %s", msg),
	}
}

// Validation constructs a validation error with the given message.
func Validation(msg string) *Error {
	return &Error{
		Kind:    KindValidation,
		Message: fmt.Sprintf("validation: %s", msg),
	}
}

// Forbidden constructs a forbidden error with the given message.
func Forbidden(msg string) *Error {
	return &Error{
		Kind:    KindForbidden,
		Message: fmt.Sprintf("forbidden: %s", msg),
	}
}

// Unauthorized constructs an unauthorized error with the given message.
func Unauthorized(msg string) *Error {
	return &Error{
		Kind:    KindUnauthorized,
		Message: fmt.Sprintf("unauthorized: %s", msg),
	}
}

// IsNotFound reports whether err is a not-found error.
func IsNotFound(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindNotFound
}

// IsConflict reports whether err is a conflict error.
func IsConflict(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindConflict
}

// IsValidation reports whether err is a validation error.
func IsValidation(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindValidation
}

// IsForbidden reports whether err is a forbidden error.
func IsForbidden(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindForbidden
}

// IsUnauthorized reports whether err is an unauthorized error.
func IsUnauthorized(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindUnauthorized
}
