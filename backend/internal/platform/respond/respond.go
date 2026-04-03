package respond

import (
	"encoding/json"
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// JSON writes a JSON response with the given status code and data.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error maps a domain error to an HTTP status code and writes a JSON error response.
func Error(w http.ResponseWriter, err error) {
	var (
		status int
		code   string
		msg    string
	)

	if domErr, ok := err.(*errors.Error); ok {
		msg = domErr.Message
		switch domErr.Kind {
		case errors.KindNotFound:
			status = http.StatusNotFound
			code = "not_found"
		case errors.KindConflict:
			status = http.StatusConflict
			code = "conflict"
		case errors.KindValidation:
			status = http.StatusBadRequest
			code = "validation"
		case errors.KindForbidden:
			status = http.StatusForbidden
			code = "forbidden"
		case errors.KindUnauthorized:
			status = http.StatusUnauthorized
			code = "unauthorized"
		default:
			status = http.StatusInternalServerError
			code = "internal"
		}
	} else {
		status = http.StatusInternalServerError
		code = "internal"
		msg = "internal server error"
	}

	JSON(w, status, errorBody{Error: errorDetail{Code: code, Message: msg}})
}

// Decode decodes the JSON request body into dst. Returns a validation error on failure.
func Decode(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.Validation(err.Error())
	}
	return nil
}
